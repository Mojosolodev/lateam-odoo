import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function Enregistrement({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword, onEmployeeAdded } = route.params || {};

  const [name, setName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [workMobile, setWorkMobile] = useState('');
  const [jobPosition, setJobPosition] = useState('');

  const handleSave = async () => {
    if (!name || !workEmail || !workPhone || !workMobile || !jobPosition) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    try {
      const response = await fetch(`${odooUrl}web/dataset/call_kw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.employee',
            method: 'create',
            args: [{
              name,
              work_email: workEmail,
              work_phone: workPhone,
              mobile_phone: workMobile,
              job_title: jobPosition,
            }],
            kwargs: {},
          },
        }),
      });

      const result = await response.json();

      if (result.result) {
        Alert.alert('Success', 'Employee added successfully!');
        if (onEmployeeAdded) {
          onEmployeeAdded(); // Trigger the callback only after successfully adding the employee
        }
        navigation.goBack(); // Navigate back to Employees.js
      } else {
        Alert.alert('Error', 'Failed to save employee. Please check your server configuration or inputs.');
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving the employee.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Employee's Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Work Email"
        value={workEmail}
        onChangeText={setWorkEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Work Phone"
        value={workPhone}
        onChangeText={setWorkPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Work Mobile"
        value={workMobile}
        onChangeText={setWorkMobile}
      />
      <TextInput
        style={styles.input}
        placeholder="Job Position"
        value={jobPosition}
        onChangeText={setJobPosition}
      />
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
