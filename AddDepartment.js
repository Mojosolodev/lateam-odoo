import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

export default function AddDepartment({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [departmentName, setDepartmentName] = useState('');
  const [manager, setManager] = useState(null);
  const [parentDepartment, setParentDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchData() {
      try {
        const deptResponse = await axios.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.department',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (deptResponse.data.result) {
          setDepartments(deptResponse.data.result);
        }

        const empResponse = await axios.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.employee',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (empResponse.data.result) {
          setEmployees(empResponse.data.result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, []);

  async function createDepartment() {
    if (!departmentName) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du département.');
      return;
    }
    try {
      const response = await axios.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.department',
          method: 'create',
          args: [{ name: departmentName, manager_id: manager, parent_id: parentDepartment }],
          kwargs: {},
        },
      });
      if (response.data.result) {
        Alert.alert('Succès', 'Département ajouté avec succès.');
        navigation.goBack();
      } else {
        Alert.alert('Erreur', 'Impossible d’ajouter le département.');
      }
    } catch (error) {
      console.error('Erreur lors de l’ajout du département:', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Add New Department</Text>
      <TextInput style={styles.input} placeholder="Department Name" value={departmentName} onChangeText={setDepartmentName} />
      <Text style={styles.label}>Manager:</Text>
      <Picker selectedValue={manager} onValueChange={setManager} style={styles.picker}>
        <Picker.Item label="Select Manager" value={null} />
        {employees.map((emp) => (
          <Picker.Item key={emp.id} label={emp.name} value={emp.id} />
        ))}
      </Picker>
      <Text style={styles.label}>Parent Department:</Text>
      <Picker selectedValue={parentDepartment} onValueChange={setParentDepartment} style={styles.picker}>
        <Picker.Item label="Select Parent Department" value={null} />
        {departments.map((dept) => (
          <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
        ))}
      </Picker>
      <TouchableOpacity style={styles.button} onPress={createDepartment}>
        <Text style={styles.buttonText}>Create Department</Text>
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
