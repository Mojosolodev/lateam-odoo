import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function Enregistrement({ route, navigation }) {
  const { odooUrl, onEmployeeAdded } = route.params || {};

  const [name, setName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [workMobile, setWorkMobile] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [wage, setWage] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchJobs();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${odooUrl}web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.department',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        }),
      });
      const result = await response.json();
      if (result.result) setDepartments(result.result);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${odooUrl}web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.job',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        }),
      });
      const result = await response.json();
      if (result.result) setJobs(result.result);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleSave = async () => {
    if (!name || !workEmail || !workPhone || !workMobile || !jobTitle || !selectedDepartment || !selectedJob || !wage) {
      Alert.alert('Validation Error', 'All fields are required, including Wage.');
      return;
    }

    try {
      // Create employee
      const employeeResponse = await fetch(`${odooUrl}web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              job_title: jobTitle,
              department_id: selectedDepartment,
              job_id: selectedJob,
            }],
            kwargs: {},
          },
        }),
      });

      const employeeResult = await employeeResponse.json();

      if (employeeResult.result) {
        const employeeId = employeeResult.result;

        // Create contract for the employee with the entered wage
        const contractResponse = await fetch(`${odooUrl}web/dataset/call_kw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.contract',
              method: 'create',
              args: [{
                name: `Contract for ${name}`,
                employee_id: employeeId,
                wage: parseFloat(wage),
                struct_id: 1, // assuming default salary structure id
              }],
              kwargs: {},
            },
          }),
        });

        const contractResult = await contractResponse.json();

        if (contractResult.result) {
          Alert.alert('Success', 'Employee and contract added successfully!');
          if (onEmployeeAdded) onEmployeeAdded();
          navigation.goBack();
        } else {
          Alert.alert('Success', 'Employee added, You can now set his/her Salary.');
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', 'Failed to save employee. Please check your server or inputs.');
      }
    } catch (error) {
      console.error('Error saving employee or contract:', error);
      Alert.alert('Error', 'Check Your Internet access.');
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
        keyboardType='phone-pad'
      />
      <TextInput
        style={styles.input}
        placeholder="Work Mobile"
        value={workMobile}
        onChangeText={setWorkMobile}
        keyboardType='phone-pad'
      />
      <TextInput
        style={styles.input}
        placeholder="Job Title"
        value={jobTitle}
        onChangeText={setJobTitle}
      />
      <Picker selectedValue={selectedDepartment} onValueChange={setSelectedDepartment} style={styles.input}>
        <Picker.Item label="Select Department" value={null} />
        {departments.map(dept => <Picker.Item key={dept.id} label={dept.name} value={dept.id} />)}
      </Picker>
      <Picker selectedValue={selectedJob} onValueChange={setSelectedJob} style={styles.input}>
        <Picker.Item label="Select Job Position" value={null} />
        {jobs.map(job => <Picker.Item key={job.id} label={job.name} value={job.id} />)}
      </Picker>
      <TextInput
        style={styles.input}
        placeholder="Wage (FCFA)"
        value={wage}
        onChangeText={setWage}
        keyboardType='numeric'
      />
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Add Employee</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
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
  buttonText: { color: '#fff', fontSize: 16 },
});
