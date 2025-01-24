import React, { useState } from 'react';
import axios from 'axios';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert } from 'react-native';

export default function LoginScreen({navigation}) {

  // Odoo credentials
  //const ODOO_URL = 'https://your-odoo-instance.com';
  const ODOO_URL = 'http://192.168.43.232:8069/';
  const ODOO_DB = 'odoodb';
  const ODOO_USERNAME = 'admin';
  const ODOO_PASSWORD = 'openpgpwd';

  async function authenticate() {
    const authData = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: ODOO_DB,
        login: ODOO_USERNAME,
        password: ODOO_PASSWORD,
      },
      id: new Date().getTime(),
    };

    try {
      const response = await axios.post(`${ODOO_URL}web/session/authenticate`, authData, {
        headers: { "Content-Type": "application/json" },
      });

      // Check for response data validity
      if (response.data && response.data.result) {
        Alert.alert('Connected Successfully', 'You are now authenticated.');
        navigation.navigate('Home', {
          odooUrl: ODOO_URL,
          odooDb: ODOO_DB,
          odooUsername: ODOO_USERNAME,
          odooPassword: ODOO_PASSWORD,
        });
        
      } else if (response.data && response.data.error && response.data.error.data.name === 'odoo.exceptions.AccessDenied') {
        Alert.alert('Wrong Credentials', 'Access Denied. Please check your username or password.');
      } else {
        Alert.alert('Error', 'An unknown error occurred.');
      }
    } catch (error) {
      console.error('Error authenticating with Odoo API:', error.response?.data || error.message);
      Alert.alert('Error', 'Connect to Odoo Failed. Please try again.');
    }
  }

  



  const [serverAddress, setServerAddress] = useState('');
  const [database, setDatabase] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    Alert.alert('Login', `Server: ${serverAddress}\nDatabase: ${database}\nEmail/Username: ${emailOrUsername}\nPassword: ${password}`);
  };

  const handleCreateAccount = () => {
    Alert.alert('Redirect', 'Redirecting to create account screen...');
  };
  const handleConnectOdoo = () => {
    authenticate();
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Adresse du serveur"
        value={serverAddress}
        onChangeText={setServerAddress}
      />
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
      <TouchableOpacity style={styles.button} onPress={handleConnectOdoo}>
        <Text style={styles.buttonText}>Connect Odoo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCreateAccount}>
        <Text style={styles.createAccountText}>Créer un compte</Text>
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
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
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
    color: '#007bff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
