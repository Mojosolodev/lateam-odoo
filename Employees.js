import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Wrap Axios with cookie jar support
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function Employees({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchEmployees() {
    try {
      console.log('Authenticating with:', { odooUrl, odooDb, odooUsername, odooPassword });
  
      // Step 1: Authenticate and store session cookies
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });
  
      console.log('Full Auth Response:', authResponse.data);
  
      if (!authResponse.data.result) {
        Alert.alert('Error', 'Failed to authenticate with Odoo.');
        setLoading(false);
        return;
      }
  
      // Step 2: Fetch employee data using session cookies
      const employeesResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.employee', // Model name
          method: 'search_read', // Method to call
          args: [[], ['id', 'name', 'job_title', 'mobile_phone', 'work_phone']], // Include 'mobile_phone' and 'work_phone' fields
          kwargs: {}, // Add this parameter to satisfy Odoo's API requirements
        },
      });
  
      console.log('Employees Response:', employeesResponse.data);
  
      if (employeesResponse.data.result) {
        setEmployees(employeesResponse.data.result);
      } else {
        Alert.alert('Error', 'Failed to fetch employees.');
      }
    } catch (error) {
      console.error('Error fetching employees:', error.response?.data || error.message);
      Alert.alert('Error', 'An error occurred while fetching employees.');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : employees.length > 0 ? (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.employeeCard}>
              <View style={styles.employeeImageContainer}>
                <Text style={styles.employeeImage}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.employeeName}>{item.name}</Text>
                <Text style={styles.employeeJob}>{item.job_title || 'No Job Title'}</Text>
                <Text style={styles.employeeMobile}>{item.mobile_phone || 'No Mobile Phone'}</Text>
                <Text style={styles.employeeWorkPhone}>{item.work_phone || 'No Work Phone'}</Text>
              </View>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noDataText}>No employees found.</Text>
      )}
      <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Add Employee', 'Add Employee button pressed!')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 3,
  },
  employeeImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  employeeImage: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  employeeName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  employeeJob: { fontSize: 14, color: '#666', marginTop: 4 },
  employeeMobile: { fontSize: 14, color: '#007bff', marginTop: 4 },
  employeeWorkPhone: { fontSize: 14, color: '#009688', marginTop: 4 },
  noDataText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
