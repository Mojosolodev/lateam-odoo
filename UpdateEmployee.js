import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Wrap Axios with cookie jar support
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function UpdateEmployee({ route, navigation }) {
  // Extract all transmitted data from the route
  const {
    employeeId,
    employeeName,
    employeeJob,
    employeeMobile,
    employeeWorkPhone,
    odooUrl,
    odooDb,
    odooUsername,
    odooPassword,
    onEmployeeUpdated, // The callback function for refreshing the employee list
  } = route.params || {};

  // State for updated employee details
  const [name, setName] = useState(employeeName || '');
  const [job, setJob] = useState(employeeJob || '');
  const [mobile, setMobile] = useState(employeeMobile || '');
  const [workPhone, setWorkPhone] = useState(employeeWorkPhone || '');

  async function handleSave() {
    // Validation to ensure fields are not empty
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    if (!job.trim()) {
      Alert.alert('Validation Error', 'Job Position cannot be empty.');
      return;
    }

    try {
      console.log('Authenticating with:', { odooUrl, odooDb, odooUsername, odooPassword });

      // Step 1: Authenticate with Odoo
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      console.log('Auth Response:', authResponse.data);

      if (!authResponse.data.result) {
        Alert.alert('Error', 'Failed to authenticate with Odoo.');
        return;
      }

      // Step 2: Update employee information in Odoo
      const updateResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.employee',
          method: 'write',
          args: [[employeeId], { name, job_title: job, mobile_phone: mobile, work_phone: workPhone }],
          kwargs: {},
        },
      });

      console.log('Update Response:', updateResponse.data);

      if (updateResponse.data.result) {
        Alert.alert('Success', 'Employee details have been updated.');

        // Trigger the callback to refresh the employee list
        if (onEmployeeUpdated) {
          onEmployeeUpdated();
        }

        navigation.goBack(); // Navigate back after successful update
      } else {
        Alert.alert('Error', 'Failed to update employee details.');
      }
    } catch (error) {
      console.error('Error updating employee:', error.response?.data || error.message);
      Alert.alert('Error', 'An error occurred while updating the employee details.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name:</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter Name"
      />
      <Text style={styles.label}>Job Position:</Text>
      <TextInput
        style={styles.input}
        value={job}
        onChangeText={setJob}
        placeholder="Enter Job Position"
      />
      <Text style={styles.label}>Work Mobile:</Text>
      <TextInput
        style={styles.input}
        value={mobile}
        onChangeText={setMobile}
        placeholder="Enter Work Mobile"
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>Work Phone:</Text>
      <TextInput
        style={styles.input}
        value={workPhone}
        onChangeText={setWorkPhone}
        placeholder="Enter Work Phone"
        keyboardType="phone-pad"
      />
      <Button title="Update" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontSize: 16, marginBottom: 8 ,fontWeight:'bold'},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
});
