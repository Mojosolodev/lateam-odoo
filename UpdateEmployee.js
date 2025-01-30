import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image } from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Wrap Axios with cookie jar support
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function UpdateEmployee({ route, navigation }) {
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
    onEmployeeUpdated,
  } = route.params || {};

  const [name, setName] = useState(employeeName || '');
  const [job, setJob] = useState(employeeJob || '');
  const [mobile, setMobile] = useState(employeeMobile || '');
  const [workPhone, setWorkPhone] = useState(employeeWorkPhone || '');
  const [employeeImage, setEmployeeImage] = useState(null);
  const [imageSize, setImageSize] = useState(null);

  useEffect(() => {
    async function fetchEmployeeImage() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.employee',
            method: 'read',
            args: [[employeeId], ['image_1920']],
            kwargs: {},
          },
        });
        
        if (response.data.result && response.data.result.length > 0) {
          const base64Image = response.data.result[0].image_1920;
          if (base64Image) {
            const binaryImage = atob(base64Image);
            const sizeInBytes = binaryImage.length;
            setImageSize(sizeInBytes);
            if (sizeInBytes >= 5120) {
              setEmployeeImage(`data:image/png;base64,${base64Image}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching employee image:', error);
      }
    }
    
    fetchEmployeeImage();
  }, [employeeId]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    if (!job.trim()) {
      Alert.alert('Validation Error', 'Job Position cannot be empty.');
      return;
    }

    try {
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        Alert.alert('Error', 'Failed to authenticate with Odoo.');
        return;
      }

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

      if (updateResponse.data.result) {
        Alert.alert('Success', 'Employee details have been updated.');
        if (onEmployeeUpdated) {
          onEmployeeUpdated();
        }
        navigation.goBack();
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
      {employeeImage ? (
        <Image source={{ uri: employeeImage }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.label}>Name:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter Name" />
      <Text style={styles.label}>Job Position:</Text>
      <TextInput style={styles.input} value={job} onChangeText={setJob} placeholder="Enter Job Position" />
      <Text style={styles.label}>Work Mobile:</Text>
      <TextInput style={styles.input} value={mobile} onChangeText={setMobile} placeholder="Enter Work Mobile" keyboardType="phone-pad" />
      <Text style={styles.label}>Work Phone:</Text>
      <TextInput style={styles.input} value={workPhone} onChangeText={setWorkPhone} placeholder="Enter Work Phone" keyboardType="phone-pad" />
      <Button title="Update" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', alignItems: 'center' },
  label: { fontSize: 16, marginBottom: 8, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
    width: '100%',
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 16,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  initial: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#fff',
  },
});
