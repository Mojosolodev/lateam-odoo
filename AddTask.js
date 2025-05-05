import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    Alert,
    ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { Picker } from '@react-native-picker/picker';

const cookieJar = new CookieJar();
const client = wrapper(axios.create({
    baseURL: '',
    withCredentials: true,
    jar: cookieJar,
}));

export default function AddTask({ route, navigation }) {
    const { odooUrl, odooDb, odooUsername, odooPassword, projectId, projectName } = route.params;

    const [taskName, setTaskName] = useState('');
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            await client.post(`${odooUrl}web/session/authenticate`, {
                jsonrpc: '2.0',
                params: {
                    db: odooDb,
                    login: odooUsername,
                    password: odooPassword,
                },
            });

            const userResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'res.users',
                    method: 'search_read',
                    args: [[]],
                    kwargs: {
                        fields: ['id', 'name'],
                        limit: 100,
                    },
                },
            });

            setUsers(userResponse.data.result);
        } catch (error) {
            console.error('Fetch users error:', error);
            Alert.alert("Error", "Failed to load users.");
        } finally {
            setLoading(false);
        }
    };

    const createTask = async () => {
        if (!taskName.trim()) {
            Alert.alert("Validation", "Please enter a task name.");
            return;
        }

        try {
            setLoading(true);

            const createResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'project.task',
                    method: 'create',
                    args: [{
                        name: taskName,
                        project_id: projectId,
                        user_ids: selectedUserId ? [[6, 0, [selectedUserId]]] : [],
                    }],
                    kwargs: {},
                },
            });

            if (createResponse.data.result) {
                Alert.alert("Success", "Task created successfully.");
                navigation.goBack();
            }
        } catch (error) {
            console.error('Create task error:', error);
            Alert.alert("Error", "Failed to create task.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Task for {projectName}</Text>

            <TextInput
                style={styles.input}
                placeholder="Task Name"
                value={taskName}
                onChangeText={setTaskName}
            />

            <Text style={styles.label}>Assign To:</Text>
            {loading ? (
                <ActivityIndicator size="small" color="#007bff" />
            ) : (
                <Picker
                    selectedValue={selectedUserId}
                    onValueChange={(itemValue) => setSelectedUserId(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="Select Employee" value={null} />
                    {users.map(user => (
                        <Picker.Item key={user.id} label={user.name} value={user.id} />
                    ))}
                </Picker>
            )}

            <Button title="Create Task" onPress={createTask} disabled={loading} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 10,
        marginBottom: 16,
        backgroundColor: '#fff'
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    picker: {
        height: 50,
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 4,
    },
});
