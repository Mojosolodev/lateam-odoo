import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import moment from 'moment';
import { Picker } from '@react-native-picker/picker';

const cookieJar = new CookieJar();
const client = wrapper(axios.create({
  baseURL: '',
  withCredentials: true,
  jar: cookieJar,
}));

export default function EditProject({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword, projectId, name: initName, date_start, date, user_id } = route.params;

  const [name, setName] = useState(initName);
  const [startDate, setStartDate] = useState(new Date(date_start));
  const [endDate, setEndDate] = useState(new Date(date));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState(user_id);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.users',
          method: 'search_read',
          args: [[], ['id', 'name']],
          kwargs: {},
        },
      });

      setEmployees(response.data.result || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Could not fetch employee list.');
    }
  };

  const handleUpdateProject = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Project name is required.');
      return;
    }

    setLoading(true);

    try {
      await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      const formattedStart = moment(startDate).format('YYYY-MM-DD');
      const formattedEnd = moment(endDate).format('YYYY-MM-DD');

      const updateResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'project.project',
          method: 'write',
          args: [[projectId], {
            name,
            date_start: formattedStart,
            date: formattedEnd,
            user_id: selectedManagerId,
          }],
          kwargs: {},
        },
      });

      if (updateResponse.data.result) {
        Alert.alert('Success', `Project "${name}" updated!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', 'Project could not be updated.');
      }

    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error', 'An error occurred while updating the project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Project</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter project name"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Assign Project Manager:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedManagerId}
          onValueChange={(itemValue) => setSelectedManagerId(itemValue)}
        >
          <Picker.Item label="-- Select Manager --" value={null} />
          {employees.map(emp => (
            <Picker.Item key={emp.id} label={emp.name} value={emp.id} />
          ))}
        </Picker>
      </View>

      {/* Start Date Picker */}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowStartPicker(true)}
      >
        <Text style={styles.dateText}>
          Start Date: {moment(startDate).format('YYYY-MM-DD')}
        </Text>
      </TouchableOpacity>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}

      {/* End Date Picker */}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowEndPicker(true)}
      >
        <Text style={styles.dateText}>
          End Date: {moment(endDate).format('YYYY-MM-DD')}
        </Text>
      </TouchableOpacity>

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdateProject}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  dateButton: {
    backgroundColor: '#e6e6e6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});
