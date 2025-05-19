import React, { useState } from 'react';
import axios from 'axios';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import qs from 'qs';

const retryLoginAsAdmin = async (database, odooUrl, adminPassword, retries = 5, delay = 2000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        console.log(`Admin login attempt ${attempt}/${retries}...`);
        try {
            const loginRes = await axios.post(`${odooUrl}web/session/authenticate`, {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    db: database,
                    login: "admin",
                    password: adminPassword
                },
                id: new Date().getTime()
            }, {
                headers: { "Content-Type": "application/json" }
            });

            const session = loginRes.data.result;
            if (session && session.uid) {
                console.log('Logged in as admin. UID:', session.uid);
                return session;
            }
        } catch (err) {
            console.warn(`Login attempt ${attempt} failed: ${err.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Admin login failed after retries. Cannot create user.');
};

export default function SignUpScreen({ navigation }) {
    const [serverAddress, setServerAddress] = useState('');
    const [database, setDatabase] = useState('');
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const adminPassword = 'openpgpwd'; // This must be in plain text in your odoo.conf

    const handleSignUp = async () => {
        if (!serverAddress || !database || !emailOrUsername || !password) {
            Alert.alert('Missing Fields', 'Please fill in all fields.');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Duplicate the DB
            console.log('Duplicating DB...');
            const dbRes = await axios.post(
                `${serverAddress}web/database/duplicate`,
                qs.stringify({
                    master_pwd: adminPassword,
                    name: 'odoodb',       // Source template
                    new_name: database    // New DB name
                }),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                }
            );

            if (dbRes.data.error) {
                throw new Error(dbRes.data.error.data.message);
            }

            console.log('DB duplicated successfully.');

            // Step 2: Retry login until DB is ready
            const session = await retryLoginAsAdmin(database, serverAddress, adminPassword);

            // Step 3: Create the user
            console.log('Creating user...');
            const userRes = await axios.post(`${serverAddress}web/dataset/call_kw/res.users/create`, {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "res.users",
                    method: "create",
                    args: [{
                        name: emailOrUsername,
                        login: emailOrUsername,
                        password: password,
                        email: emailOrUsername
                    }],
                    kwargs: {}
                },
                id: new Date().getTime()
            }, {
                headers: { "Content-Type": "application/json" },
                withCredentials: true
            });

            if (userRes.data.error) {
                throw new Error(userRes.data.error.data.message);
            }

            console.log('User created successfully.');
            Alert.alert('Success', 'Company created and user added!');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

        } catch (error) {
            console.error('Signup error:', error.response?.data || error.message);
            Alert.alert('Signup failed', error.message || 'Check console for more info.');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateToLogin = () => {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    return (
        <View style={styles.container}>
            <Image source={require('./images/laTeam noBG.png')} style={styles.logo} />
            <TextInput
                style={styles.input}
                placeholder="Adresse_serveur:http://<IPV4>:8069/"
                value={serverAddress}
                onChangeText={setServerAddress}
            />
            <TextInput
                style={styles.input}
                placeholder="New Company Name"
                value={database}
                onChangeText={setDatabase}
            />
            <TextInput
                style={styles.input}
                placeholder="Email/Nom d'utilisateur"
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
            />
            <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleSignUp}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Create Company</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNavigateToLogin}>
                <Text style={styles.loginLink}>Already have a Company? Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
    logo: { width: 500, height: 174, marginBottom: 20 },
    input: {
        width: '100%', height: 50, borderColor: '#ccc',
        borderWidth: 1, borderRadius: 5, marginBottom: 15,
        paddingLeft: 10, backgroundColor: '#fff'
    },
    button: {
        width: '100%', height: 50, backgroundColor: '#28a745',
        justifyContent: 'center', alignItems: 'center',
        borderRadius: 5, marginTop: 10, marginBottom: 15
    },
    buttonText: { color: '#fff', fontSize: 16 },
    loginLink: { color: '#007bff', fontSize: 16, textDecorationLine: 'underline' }
});
