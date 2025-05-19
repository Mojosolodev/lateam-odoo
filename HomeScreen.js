import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import Employees from './Employees';
import More from './More';
import Jobs from './Jobs';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

const Tab = createBottomTabNavigator();

function Dashboard({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [employeeCount, setEmployeeCount] = useState(null);
  const [departmentCount, setDepartmentCount] = useState(null);
  const [jobPositionCount, setJobPositionCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  async function fetchCounts() {
    try {
      setIsFetching(true);
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        Alert.alert('Error', 'Failed to authenticate with Odoo.');
        return;
      }

      const models = ['hr.employee', 'hr.department', 'hr.job'];
      const setCounts = [setEmployeeCount, setDepartmentCount, setJobPositionCount];

      await Promise.all(models.map(async (model, index) => {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: model,
            method: 'search_count',
            args: [[]],
            kwargs: {},
          },
        });
        const count = response.data.result;
        if (typeof count === 'number') {
          setCounts[index](count);
        } else {
          Alert.alert('Error', `Failed to fetch ${model} count.`);
        }

      }));
    } catch (error) {
      console.error('Error fetching counts:', error.response?.data || error.message);
      Alert.alert('Error', 'An error occurred while fetching data.');
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [odooUrl, odooDb, odooUsername, odooPassword]);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Manage your Company with Ease</Text>
            <Text style={styles.headerSubtitle}>Real-time insights. Smarter decisions.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Employees</Text>
            <Text style={styles.cardCount}>{employeeCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Departments</Text>
            <Text style={styles.cardCount}>{departmentCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Job Positions</Text>
            <Text style={styles.cardCount}>{jobPositionCount}</Text>
          </View>
        </>
      )}
      {isFetching && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#007bff' },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#d1d1d1',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={(props) => (
          <Dashboard {...props} route={{ params: { odooUrl, odooDb, odooUsername, odooPassword } }} />
        )}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Employees"
        component={(props) => (
          <Employees {...props} route={{ params: { odooUrl, odooDb, odooUsername, odooPassword } }} />
        )}
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={(props) => (
          <Jobs {...props} route={{ params: { odooUrl, odooDb, odooUsername, odooPassword } }} />
        )}
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={(props) => (
          <More {...props} route={{ params: { odooUrl, odooDb, odooUsername, odooPassword } }} />
        )}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    elevation: 5,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 10,
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
  },
  overlay: {
    position: 'absolute',
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    zIndex: 1000,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
    textAlign: 'center',
  },

});
