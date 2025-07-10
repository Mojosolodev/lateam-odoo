import React, { useState } from 'react';
import axios from 'axios';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';

export default function LoginScreen({ navigation }) {

  const [serverAddress, setServerAddress] = useState('https://lateamodoo.duckdns.org/');
  const [database, setDatabase] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function authenticate(retries = 3, delay = 2000) {
    setLoading(true); // Start loading

    const authData = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: database,
        login: emailOrUsername,
        password: password,
      },
      id: new Date().getTime(),
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Login attempt ${attempt}/${retries}`);
        const response = await axios.post(`${serverAddress}web/session/authenticate`, authData, {
          headers: { "Content-Type": "application/json" },
        });

        if (response.data && response.data.result) {
          Alert.alert('Connected Successfully', 'Welcome or Welcome Back.');
          navigation.navigate('Home', {
            odooUrl: serverAddress,
            odooDb: database,
            odooUsername: emailOrUsername,
            odooPassword: password,
          });
          return; // Exit after successful login
        } else if (response.data?.error?.data?.name === 'odoo.exceptions.AccessDenied') {
          Alert.alert('Wrong Credentials', 'Access Denied. Please check your username or password.');
          break;
        } else {
          console.warn('Unknown response error:', response.data?.error);
        }
      } catch (error) {
        console.warn(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          Alert.alert('Error', 'Connect to company failed after multiple attempts. Please try again.');
        }
      }

      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delay));
      }
    }

    setLoading(false); // Stop loading
  }

  const handleCreateAccount = () => {
    Alert.alert('Redirect', 'Redirecting to create account screen...');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('./images/laTeam noBG.png')} // Adjust the path if necessary
        style={styles.logo}
      />
      <Text style={styles.headerTitle}>Manage your Company with Ease</Text>
      <TextInput
        style={styles.input}
        placeholder="Company Name"
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
        onPress={() => authenticate()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Connect Company</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.createAccountText}>Don't have a company? Create Company</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    width: 500,
    height: 174,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingLeft: 10,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  createAccountText: {
    color: '#31ae21',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginTop:10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3393ff',
    textAlign: 'center',
    marginBottom: 20,
  },
});
