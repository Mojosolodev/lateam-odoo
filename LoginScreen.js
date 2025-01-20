import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert } from 'react-native';

export default function LoginScreen() {
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
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Se connecter</Text>
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
