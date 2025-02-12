import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function AddJob({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [jobName, setJobName] = useState('');
  const [jobSummary, setJobSummary] = useState('');
  const [departmentId, setDepartmentId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employmentTypeId, setEmploymentTypeId] = useState(null);
  const [employmentTypes, setEmploymentTypes] = useState([]);

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

    async function fetchEmploymentTypes() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.contract.type',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (response.data.result) {
          setEmploymentTypes(response.data.result);
        }
      } catch (error) {
        console.error('Error fetching employment types:', error);
      }
    }

    fetchDepartments();
    fetchEmploymentTypes();
  }, []);

  async function handleAddJob() {
    if (!jobName || !jobSummary || !departmentId || !employmentTypeId) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        Alert.alert('Erreur', 'Échec de l’authentification avec Odoo.');
        return;
      }

      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'create',
          args: [{
            name: jobName,
            description: jobSummary,
            department_id: departmentId,
            contract_type_id: employmentTypeId,
          }],
          kwargs: {},
        },
      });

      if (response.data.result) {
        Alert.alert('Succès', 'Poste ajouté avec succès.');
        navigation.goBack();
      } else {
        Alert.alert('Erreur', 'Impossible d’ajouter le poste.');
      }
    } catch (error) {
      console.error('Erreur lors de l’ajout du poste:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Add New Job</Text>
      <TextInput style={styles.input} placeholder="Job Name" value={jobName} onChangeText={setJobName} />
      <Text style={styles.label}>Department:</Text>
      <Picker selectedValue={departmentId} onValueChange={setDepartmentId} style={styles.picker}>
        <Picker.Item label="Select Department" value={null} />
        {departments.map((dept) => (
          <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
        ))}
      </Picker>
      <Text style={styles.label}>Employment Type:</Text>
      <Picker selectedValue={employmentTypeId} onValueChange={setEmploymentTypeId} style={styles.picker}>
        <Picker.Item label="Select Employment Type" value={null} />
        {employmentTypes.map((type) => (
          <Picker.Item key={type.id} label={type.name} value={type.id} />
        ))}
      </Picker>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Job Summary"
        value={jobSummary}
        onChangeText={setJobSummary}
        multiline
        numberOfLines={4}
      />
      <TouchableOpacity style={styles.button} onPress={handleAddJob}>
        <Text style={styles.buttonText}>Create Job</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    width: '90%',
    maxWidth: 400,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    width: '90%',
    maxWidth: 400,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
