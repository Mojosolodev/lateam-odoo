import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function UpdateEmployee({ route, navigation }) {
  const { employee, odooUrl, odooDb, odooUsername, odooPassword, onEmployeeUpdated } = route.params;

  const [name, setName] = useState(employee.name || '');
  const [job, setJob] = useState(employee.job_title || '');
  const [departmentId, setDepartmentId] = useState(employee.department_id ? employee.department_id[0] : null);
  const [departments, setDepartments] = useState([]);
  const [jobId, setJobId] = useState(employee.job_id ? employee.job_id[0] : null);
  const [jobPositions, setJobPositions] = useState([]);
  const [wage, setWage] = useState('');
  const [loading, setLoading] = useState(false);

  const [employeeImage, setEmployeeImage] = useState(employee.image_1920 ? `data:image/png;base64,${employee.image_1920}` : null);

  function getImageSize(base64String) {
    return (base64String.length * (3 / 4)) - (base64String.endsWith("=") ? 1 : 0) - (base64String.endsWith("==") ? 1 : 0);
  }

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.department',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (response.data.result) {
          setDepartments(response.data.result);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    }

    async function fetchJobPositions() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.job',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (response.data.result) {
          setJobPositions(response.data.result);
        }
      } catch (error) {
        console.error('Error fetching job positions:', error);
      }
    }
    async function fetchEmployeeWage() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.contract',
            method: 'search_read',
            args: [[['employee_id', '=', employee.id]], ['id', 'wage']],
            kwargs: {},
          },
        });
        if (response.data.result && response.data.result.length > 0) {
          setWage(String(response.data.result[0].wage || ''));
        }
      } catch (error) {
        console.error('Error fetching employee wage:', error);
      }
    }

    fetchDepartments();
    fetchJobPositions();
    fetchEmployeeWage();
  }, []);

  async function handleSave() {
    if (!name.trim() || !job.trim() || !departmentId || !jobId) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    try {
      setLoading(true);
      console.log('Authenticating with:', { odooUrl, odooDb, odooUsername, odooPassword });
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });
      console.log('Auth Response:', authResponse.data);

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
          args: [[employee.id], {
            name,
            job_title: job,
            department_id: departmentId,
            job_id: jobId,
          }],
          kwargs: {},
        },
      });

      // Now handle wage update or creation
      let wageUpdated = true;
      if (wage.trim()) {
        const contractResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.contract',
            method: 'search_read',
            args: [[['employee_id', '=', employee.id]], ['id']],
            kwargs: {},
          },
        });

        console.log('Contract search response:', contractResponse.data);

        if (contractResponse.data.result && contractResponse.data.result.length > 0) {
          // Existing contract found - update wage
          const contractId = contractResponse.data.result[0].id;
          console.log('Updating existing contract:', contractId);

          const wageResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.contract',
              method: 'write',
              args: [[contractId], { wage: parseFloat(wage) }],
              kwargs: {},
            },
          });
          wageUpdated = wageResponse.data.result;
          console.log('Wage update response:', wageResponse.data);
        } else {
          // No contract - create a new one
          console.log('No contract found. Creating new contract.');
          const createResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.contract',
              method: 'create',
              args: [{
                name: `${employee.name} Contract`,
                employee_id: employee.id,
                wage: parseFloat(wage),
                date_start: new Date().toISOString().slice(0, 10), // e.g. "2025-06-29"
              }],
              kwargs: {},
            },
          });
          console.log('Contract create response:', createResponse.data);
          wageUpdated = createResponse.data.result != null;
        }
      }

      if (updateResponse.data.result && wageUpdated) {
        Alert.alert('Success', 'Employee details have been updated.');
        if (onEmployeeUpdated) onEmployeeUpdated();
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to update employee details.');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      Alert.alert('Error', 'An error occurred while updating the employee details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {employee.image_1920 && getImageSize(employee.image_1920) >= 5 * 1024 ? (
        <Image source={{ uri: employeeImage }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.label}>Name:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter Name" />
      <Text style={styles.label}>Job Title:</Text>
      <TextInput style={styles.input} value={job} onChangeText={setJob} placeholder="Enter Job Title" />
      <Text style={styles.label}>Department:</Text>
      <Picker selectedValue={departmentId} onValueChange={setDepartmentId} style={styles.picker}>
        <Picker.Item label="Select Department" value={null} />
        {departments.map((dept) => (
          <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
        ))}
      </Picker>
      <Text style={styles.label}>Job Position:</Text>
      <Picker selectedValue={jobId} onValueChange={setJobId} style={styles.picker}>
        <Picker.Item label="Select Job Position" value={null} />
        {jobPositions.map((job) => (
          <Picker.Item key={job.id} label={job.name} value={job.id} />
        ))}
      </Picker>
      <Text style={styles.label}>Salary:</Text>
      <TextInput style={styles.input} value={wage} onChangeText={setWage} placeholder="Enter Wage" keyboardType="numeric" />

      <Button title="Update" onPress={handleSave} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
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
  picker: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    backgroundColor: 'lightgray',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
