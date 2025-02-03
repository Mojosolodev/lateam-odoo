import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Employees from './Employees';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Wrap Axios with cookie jar support
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

const Tab = createBottomTabNavigator();

function Dashboard({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [employeeCount, setEmployeeCount] = useState(null);
  const [previousEmployeeCount, setPreviousEmployeeCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // New state for fetching

  async function fetchEmployeeCount() {
    try {
      setIsFetching(true); // Start fetching
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        Alert.alert('Error', 'Failed to authenticate with Odoo.');
        return;
      }

      const countResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.employee',
          method: 'search_count',
          args: [[]],
          kwargs: {},
        },
      });

      if (countResponse.data.result) {
        // Update employee count only if it's different
        if (previousEmployeeCount !== countResponse.data.result) {
          setPreviousEmployeeCount(employeeCount); // Store the current count before updating
          setEmployeeCount(countResponse.data.result);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch employee count.');
      }
    } catch (error) {
      console.error('Error fetching employee count:', error.response?.data || error.message);
      Alert.alert('Error', 'An error occurred while fetching employee count.');
    } finally {
      setIsFetching(false); // Stop fetching
    }
  }

  useEffect(() => {
    fetchEmployeeCount();
    const interval = setInterval(fetchEmployeeCount, 10000); // Fetch every 10 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [odooUrl, odooDb, odooUsername, odooPassword]);

  useEffect(() => {
    setLoading(false); // Set loading to false after the first mount
  }, []);

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Employees</Text>
          <Text style={styles.cardCount}>{employeeCount}</Text>
        </View>
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
        tabBarStyle: { backgroundColor: '#007bff' }, // Set bottom tab bar color
        tabBarActiveTintColor: '#ffffff', // Active icon color
        tabBarInactiveTintColor: '#d1d1d1', // Inactive icon color
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
    </Tab.Navigator>
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
    zIndex: 1000, // Ensure it appears on top
  },
});