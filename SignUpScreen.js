import React, { useState } from 'react';
import axios from 'axios';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import qs from 'qs';

export default function SignUpScreen({ navigation }) {
    const [database, setDatabase] = useState('');
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const odooUrl = 'http://192.168.17.148:8069/';
    const adminPassword = 'openpgpwd'; // This must be in plain text in your odoo.conf

    const handleSignUp = async () => {

        if (!database || !emailOrUsername || !password) {
            Alert.alert('Missing Fields', 'Please fill in all fields.');
            return;
        }

        setLoading(true);

        try {
            //Create DB
            console.log('Creating DB...');
            const dbRes = await axios.post(
                `${odooUrl}web/database/create`,
                qs.stringify({
                    master_pwd: 'openpgpwd',
                    name: database,
                    login: emailOrUsername,
                    password: password,
                    lang: "en_US",
                    phone: "0000000000",       // Required by Odoo's controller
                    country_code: "us",        // Required
                    demo: false                // Optional
                }),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                }
            );

            if (dbRes.data.error) {
                console.error('DB creation error:', dbRes.data.error);
                throw new Error(dbRes.data.error.data.message);
            }

            console.log('DB created successfully.');

            Alert.alert('Success', 'Company Created');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

        } catch (error) {
            console.error('Signup error:', error.response?.data || error.message);
            console.error('Raw error:', error.toJSON?.() || error);
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
                placeholder="Base de données"
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
