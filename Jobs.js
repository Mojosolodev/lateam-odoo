import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function Jobs({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [jobPositionCount, setJobPositionCount] = useState(null);
  const [departmentCount, setDepartmentCount] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  async function fetchCounts() {
    try {
      setLoading(true);
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        Alert.alert('Erreur', 'Échec de l’authentification avec Odoo.');
        return;
      }

      const jobResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'search_count',
          args: [[]],
          kwargs: {},
        },
      });

      const departmentResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.department',
          method: 'search_count',
          args: [[]],
          kwargs: {},
        },
      });

      if (jobResponse.data.result) {
        setJobPositionCount(jobResponse.data.result);
      }
      if (departmentResponse.data.result) {
        setDepartmentCount(departmentResponse.data.result);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  }
  async function fetchEmployeeCounts(departments) {
    try {
      const counts = await Promise.all(
        departments.map(async (dept) => {
          const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.employee',
              method: 'search_count',
              args: [[['department_id', '=', dept.id]]], // Count employees in this department
              kwargs: {},
            },
          });

          return { ...dept, employeeCount: response.data.result || 0 };
        })
      );

      setDepartments(counts);
    } catch (error) {
      console.error("Error fetching employee counts:", error);
    }
  }


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
        console.log("Fetched Departments:", response.data.result);
        fetchEmployeeCounts(response.data.result);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }




  useEffect(() => {
    fetchCounts();
    fetchDepartments();
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => { fetchCounts(), fetchDepartments() }} style={{ marginRight: 26 }}>
          <MaterialIcons name="refresh" size={28} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Job Positions</Text>
              <Text style={styles.cardCount}>{jobPositionCount}</Text>
              <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddJob', { odooUrl, odooDb, odooUsername, odooPassword })}
              >
                <MaterialIcons name="add" size={30} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Departments</Text>
              <Text style={styles.cardCount}>{departmentCount}</Text>
              <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddDepartment', { odooUrl, odooDb, odooUsername, odooPassword })}
              >
                <MaterialIcons name="add" size={30} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.choicesContainer}>
              <Text style={styles.choiceButtonText}>List of departments</Text>
          </View>
          <FlatList
            data={departments}
            style={styles.listContainer}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem}>
                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{item.name}</Text>
                <Text style={{ fontSize: 15, color: 'blue' }}>({item.employeeCount} employees)</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#e6ffff',
    padding: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 800,
    marginTop: 20,
  },
  card: {
    flex: 1,
    padding: 5,
    top: -30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    elevation: 5,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardCount: {
    fontSize: 36,
    color: '#007bff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 4,
  },
  listContainer: {
    flex: 1,
    width: '110%',
  },
  listItem: {
    padding: 25,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    width: '90%',
    alignSelf: 'center',
  },
  fab: {
    backgroundColor: '#FFA500',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    top: -5,
  },
  choicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    top:-10,
  },
  choiceButtonText: {
    textAlign: 'center',
    color: "#007bff",
    fontWeight: 'bold',
    fontSize:18,
  },
});
