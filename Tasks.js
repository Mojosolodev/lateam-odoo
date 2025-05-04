// ... imports (inchangés)
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity
} from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { MaterialIcons } from '@expo/vector-icons';

const cookieJar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: '',
    withCredentials: true,
    jar: cookieJar,
}));

export default function Tasks({ route }) {
    const { odooUrl, odooDb, odooUsername, odooPassword, projectId, projectName } = route.params;
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            await client.post(`${odooUrl}web/session/authenticate`, {
                jsonrpc: '2.0',
                params: {
                    db: odooDb,
                    login: odooUsername,
                    password: odooPassword,
                },
            });

            const taskResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.task',
                    method: 'search_read',
                    args: [[['project_id', '=', Number(projectId)]]],
                    kwargs: {
                        fields: ['id', 'name', 'state', 'project_id', 'user_ids'],
                        limit: 50,
                    },
                },
            });

            const tasksData = taskResponse.data.result;

            const userIdSet = new Set();
            tasksData.forEach(task => {
                (task.user_ids || []).forEach(id => userIdSet.add(id));
            });
            const userIds = Array.from(userIdSet);

            let userMap = {};
            if (userIds.length > 0) {
                const userResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'res.users',
                        method: 'search_read',
                        args: [[['id', 'in', userIds]]],
                        kwargs: {
                            fields: ['id', 'name'],
                            limit: 100,
                        },
                    },
                });

                userResponse.data.result.forEach(user => {
                    userMap[user.id] = user.name;
                });
            }

            const enrichedTasks = tasksData.map(task => ({
                ...task,
                assigned_names: (task.user_ids || []).map(id => userMap[id]).filter(Boolean),
            }));

            setTasks(enrichedTasks);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch tasks.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const formatState = (state) => {
        if (!state) return '';
        const cleanedState = state.replace(/^\d+_/, ''); // Cleans up state like '05_done'
        const map = {
            'in_progress': 'in progress',
            'changes_requested': 'changes requested',
            'done': 'done', // Handle 'done' specifically for '05_done'
        };
        if (cleanedState === 'done') return 'done'; // Special case for 'done'
        return map[cleanedState] || cleanedState.replace(/_/g, ' ');
    };
    
    

    const confirmDeleteTask = (taskId) => {
        Alert.alert(
            "Delete Task",
            "Are you sure you want to delete this task?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteTask(taskId) }
            ]
        );
    };

    const deleteTask = async (taskId) => {
        try {
            setLoading(true);
            await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.task',
                    method: 'unlink',
                    args: [[taskId]],
                    kwargs: {},
                },
            });

            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete the task.");
        } finally {
            setLoading(false);
        }
    };

    const openEditAlert = (taskId) => {
        Alert.alert(
            "Update Task Status",
            "Choose new status",
            [
                { text: "In Progress", onPress: () => updateTaskStatus(taskId, 'in_progress') },
                { text: "Changes Requested", onPress: () => updateTaskStatus(taskId, 'changes_requested') },
                { text: "Done", onPress: () => action_done(taskId) }, // <<<<<< MODIFIÉ ICI
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const STATE_VALUES = {
        'in_progress': '01_in_progress',
        'changes_requested': '02_changes_requested',
        // 'done' est géré par `action_done`
    };

    const updateTaskStatus = async (taskId, newStateKey) => {
        try {
            setLoading(true);
    
            if (newStateKey === 'done') {
                // Appel de la méthode action_done
                await client.post(`${odooUrl}web/dataset/call_kw`, {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'project.task',
                        method: 'action_done',
                        args: [[taskId]],
                        kwargs: {},
                    },
                });
    
                // Mise à jour locale
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task.id === taskId ? { ...task, state: '03_done' } : task
                    )
                );
            } else {
                const newStateValue = STATE_VALUES[newStateKey];
                await client.post(`${odooUrl}web/dataset/call_kw`, {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'project.task',
                        method: 'write',
                        args: [[taskId], { state: newStateValue }],
                        kwargs: {},
                    },
                });
    
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task.id === taskId ? { ...task, state: newStateValue } : task
                    )
                );
            }
        } catch (error) {
            console.error("Update error:", error);
            Alert.alert("Error", "Failed to update task status.");
        } finally {
            setLoading(false);
        }
    };
    

    const action_done = async (taskId) => {
        try {
            setLoading(true);
            const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.task',
                    method: 'action_done',
                    args: [[taskId]],
                    kwargs: {},
                },
            });
            console.log("action_done response", response); // Debugging response
    
            // Update the task locally with the correct state '05_done'
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId ? { ...task, state: '05_done' } : task
                )
            );
        } catch (error) {
            console.error("Action Done error:", error);
            Alert.alert("Error", "Failed to mark task as done.");
        } finally {
            setLoading(false);
        }
    };
    
    

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Tasks for: {projectName}</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
            ) : tasks.length === 0 ? (
                <Text style={styles.noData}>No tasks found.</Text>
            ) : (
                <FlatList
                    data={tasks}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.taskCard}>
                            <View style={styles.titleRow}>
                                <Text style={styles.taskTitle}>{item.name}</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={() => openEditAlert(item.id)}>
                                        <MaterialIcons name="edit" size={24} color="green" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => confirmDeleteTask(item.id)}>
                                        <MaterialIcons name="delete" size={24} color="red" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.taskDetail}>Status: </Text>
                                <Text style={[
                                    styles.taskValue,
                                    item.state?.toLowerCase().includes('done') ? styles.statusDone : styles.statusOther
                                ]}>
                                    {formatState(item.state)}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.taskDetail}>Assigned To: </Text>
                                <Text style={styles.assignedValue}>
                                    {item.assigned_names?.length > 0 ? item.assigned_names.join(', ') : 'Unassigned'}
                                </Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

// ... styles identiques
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f8ff', padding: 16 },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    noData: { textAlign: 'center', color: '#666', marginTop: 20 },
    taskCard: {
        backgroundColor: '#fff',
        padding: 12,
        marginVertical: 8,
        borderRadius: 6,
        elevation: 2,
    },
    taskTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskDetail: { fontSize: 14, color: '#555', marginTop: 4 },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    taskValue: {
        fontSize: 14,
    },
    statusDone: {
        color: 'green',
        fontWeight: 'bold',
    },
    statusOther: {
        color: 'orange',
        fontWeight: 'bold',
    },
    assignedValue: {
        fontSize: 14,
        color: 'blue',
        fontWeight: 'bold',
    },
});
