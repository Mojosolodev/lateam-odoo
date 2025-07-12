import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

// Wrap Axios with cookie jar support
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function Employees({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchEmployees() {
    try {
      setLoading(true);
      console.log('Authenticating with:', { odooUrl, odooDb, odooUsername, odooPassword });

      // Authenticate with Odoo
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      console.log('Auth Response:', authResponse.data);

      if (!authResponse.data.result) {
        Alert.alert('Error', 'Failed to authenticate with Odoo.');
        setLoading(false);
        return;
      }

      // Fetch employees with image_1920 and active status
      const employeesResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.employee',
          method: 'search_read',
          args: [[], ['id', 'name', 'job_title', 'mobile_phone', 'work_phone', 'image_1920', 'work_email', 'department_id', 'job_id', 'active',]], // Include active
          kwargs: {},
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

  async function handleDelete(employee) {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`Deleting employee with ID: ${employee.id}`);

              // Make the API call to delete the employee
              const deleteResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  model: 'hr.employee', // Model name
                  method: 'unlink', // Odoo method to delete a record
                  args: [[employee.id]], // Pass the employee ID as a list
                  kwargs: {}, // Required but empty
                },
              });

              console.log('Delete Response:', deleteResponse.data);

              if (deleteResponse.data.result) {
                // Update the local state to remove the deleted employee
                setEmployees((prevEmployees) =>
                  prevEmployees.filter((emp) => emp.id !== employee.id)
                );
                Alert.alert('Success', `${employee.name} has been deleted.`);
              } else {
                Alert.alert('Error', 'Failed to delete the employee.');
              }
            } catch (error) {
              console.error('Error deleting employee:', error.response?.data || error.message);
              Alert.alert('Error', 'An error occurred while trying to delete the employee.');
            }
          },
        },
      ]
    );
  }

  function getImageSize(base64String) {
    return (base64String.length * (3 / 4)) - (base64String.endsWith("=") ? 1 : 0) - (base64String.endsWith("==") ? 1 : 0);
  }

  useEffect(() => {
    fetchEmployees();

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={fetchEmployees} style={{ marginRight: 26 }}>
          <MaterialIcons name="refresh" size={28} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : employees.length > 0 ? (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.employeeCard}
              onPress={() =>
                navigation.navigate('EmployeeDetail', {
                  employee: item,
                  odooUrl,
                  odooDb,
                  odooUsername,
                  odooPassword,
                })
              }
            >
              <View style={styles.employeeInfo}>
                <View style={styles.presenceIndicator(item.active)} />
                <View style={styles.employeeImageContainer}>
                  {item.image_1920 && getImageSize(item.image_1920) >= 5 * 1024 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${item.image_1920}` }}
                      style={styles.employeeImage}
                    />
                  ) : (
                    <Text style={styles.employeeInitial}>
                      {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  )}
                </View>

                <View>
                  <Text style={styles.employeeName}>{item.name}</Text>
                  <Text style={styles.employeeJob}>{item.job_title || 'No Job Title'}</Text>
                  <Text style={styles.employeeMobile}>{item.mobile_phone || 'No Mobile Phone'}</Text>
                  <Text style={styles.employeeWorkPhone}>{item.work_phone || 'No Work Phone'}</Text>
                </View>
              </View>
              <View style={styles.employeeActions}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('UpdateEmployee', {
                      employee: item, // Pass full employee object
                      odooUrl,
                      odooDb,
                      odooUsername,
                      odooPassword,
                      onEmployeeUpdated: fetchEmployees,
                    })
                  }
                >
                  <FontAwesome name="edit" size={24} color="#007bff" style={styles.icon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <MaterialIcons name="delete" size={24} color="#ff3d00" style={styles.icon} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.noDataText}>No employees found.</Text>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('Enregistrement', {
            odooUrl,
            odooDb,
            odooUsername,
            odooPassword,
            onEmployeeAdded: fetchEmployees,
          })
        }
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#e6ffff' },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 5,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presenceIndicator: (isActive) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: isActive ? 'green' : 'red', // Green if active, red if inactive
    marginRight: 10,
  }),
  employeeImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff', // Background color for employees without images
    justifyContent: 'center',  // Center the content (image or text)
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',        // Ensure the image fits the circular shape
  },
  employeeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  employeeInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff', // White text for the initials
    textAlign: 'center',
  },
  employeeName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  employeeJob: { fontSize: 14, color: '#666', marginTop: 4 },
  employeeMobile: { fontSize: 14, color: '#007bff', marginTop: 4 },
  employeeWorkPhone: { fontSize: 14, color: '#009688', marginTop: 4 },
  employeeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  icon: {
    marginHorizontal: 8,
  },
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