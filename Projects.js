import React, { useEffect, useLayoutEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity
} from 'react-native';
import moment from 'moment';
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

export default function Projects({ route, navigation }) {
    const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const deleteProject = async (projectId) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this project?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        try {
                            await client.post(`${odooUrl}web/dataset/call_kw`, {
                                jsonrpc: "2.0",
                                method: "call",
                                params: {
                                    model: "project.project",
                                    method: "unlink",
                                    args: [[projectId]],
                                    kwargs: {},
                                },
                            });
                            setProjects(prev => prev.filter(p => p.id !== projectId));
                            Alert.alert("Success", "Project deleted successfully.");
                        } catch (error) {
                            console.error("Delete error:", error.response?.data || error.message);
                            Alert.alert("Error", "Failed to delete project.");
                        }
                    }
                }
            ]
        );
    };
    

    const fetchProjects = useCallback(async () => {
        console.log('🔄 Refresh triggered');

        try {
            setLoading(true);

            // Authenticate
            const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
                jsonrpc: '2.0',
                params: {
                    db: odooDb,
                    login: odooUsername,
                    password: odooPassword,
                },
            });

            if (!authResponse.data.result) {
                Alert.alert('Error', 'Authentication failed.');
                return;
            }

            // Fetch project IDs
            const projectIdsResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.project',
                    method: 'search',
                    args: [[]],
                    kwargs: { context: {} },
                },
            });

            const projectIds = projectIdsResponse.data.result;

            if (!Array.isArray(projectIds)) {
                console.log('Unexpected ID response:', projectIdsResponse.data);
                Alert.alert('Error', 'Could not retrieve project IDs');
                return;
            }

            // Fetch project data
            const projectResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.project',
                    method: 'read',
                    args: [projectIds, ['id', 'name', 'task_count', 'user_id', 'date_start', 'date', 'create_date', 'write_date']],
                    kwargs: { context: {} },
                },
            });

            const result = projectResponse.data.result;

            // Fetch approved tasks
            const taskResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.task',
                    method: 'search_read',
                    args: [[['state', 'ilike', 'approved']]],
                    kwargs: {
                        fields: ['id', 'project_id'],
                    },
                },
            });

            console.log('✅ Task fetch response:', taskResponse.data);

            let approvedTasks = taskResponse.data.result;

            if (!Array.isArray(approvedTasks)) {
                console.log('❌ Unexpected task response:', taskResponse.data);
                approvedTasks = []; // prevent crash
            }

            // Count approved tasks per project
            const approvedTaskCounts = approvedTasks.reduce((acc, task) => {
                const projectId = task.project_id?.[0];
                if (projectId) {
                    acc[projectId] = (acc[projectId] || 0) + 1;
                }
                return acc;
            }, {});

            // Merge approved count into projects
            const enhancedProjects = result.map(project => ({
                ...project,
                approved_task_count: approvedTaskCounts[project.id] || 0,
            }));

            setProjects(enhancedProjects);

        } catch (error) {
            console.error('Fetch error:', error.response?.data || error.message);
            Alert.alert('Error', 'An error occurred while fetching projects.');
        } finally {
            setLoading(false);
        }
    }, [client, odooUrl, odooDb, odooUsername, odooPassword]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => {
                        console.log('🔁 Header refresh clicked');
                        fetchProjects();
                    }}
                    style={{ marginRight: 26 }}
                >
                    <MaterialIcons name="refresh" size={28} color="black" />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
            ) : projects.length > 0 ? (
                <FlatList
                    data={projects}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.name}>{item.name}</Text>
                                <TouchableOpacity onPress={() => deleteProject(item.id)}>
                                    <MaterialIcons name="delete" size={24} color="red" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.id}>ID: {item.id}</Text>
                            <Text style={styles.tasks}>Tasks: {item.task_count ?? 0}</Text>
                            <Text style={styles.approved}>
                                Approved Tasks: {item.approved_task_count}
                            </Text>
                            <Text style={styles.date}>
                                Start: <Text style={styles.startDate}>{item.date_start ? moment(item.date_start).format(' D MMM, YYYY') : 'N/A'}</Text>
                            </Text>
                            <Text style={styles.date}>
                                End: <Text style={styles.endDate}>{item.date ? moment(item.date).format(' D MMM, YYYY') : 'N/A'}</Text>
                            </Text>
                            <Text style={styles.manager}>
                                Manager: {item.user_id?.[1] ?? 'Unassigned'}
                            </Text>
                        </View>
                    )}
                    
                />
            ) : (
                <Text style={styles.noData}>No projects found.</Text>
            )}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddProject', {
                    odooUrl,
                    odooDb,
                    odooUsername,
                    odooPassword,
                })}
            >
                <MaterialIcons name="add" size={32} color="#fff" />
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#e6ffff' },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 5,
    },
    name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    id: { fontSize: 14, color: '#666', marginTop: 4 },
    noData: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
    tasks: { fontSize: 16, color: '#FFA500', marginTop: 4 },
    approved: { fontSize: 15, color: '#28a745', marginTop: 4 },
    date: { fontSize: 15, color: '#555', marginTop: 4 },
    startDate: { color: '#90EE90', fontWeight: 'bold' },
    endDate: { color: '#dc3545', fontWeight: 'bold' },
    manager: { fontSize: 15, fontWeight: '500', marginTop: 4, color: '#333' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: '#007bff',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
    },
    
});
