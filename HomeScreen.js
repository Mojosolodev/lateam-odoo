import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import Employees from './Employees';

const Tab = createBottomTabNavigator();

function Dashboard({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  if (!odooUrl || !odooDb || !odooUsername || !odooPassword) {
    console.error('Missing credentials in Dashboard. Ensure parameters are passed correctly.');
    return (
      <View style={styles.screen}>
        <Text style={{ color: 'red' }}>Error: Missing credentials. Please log in again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Welcome to the Dashboard!</Text>
    </View>
  );
}

export default function HomeScreen({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params;

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Dashboard"
        component={(props) => (
          <Dashboard {...props} route={{ params: { odooUrl, odooDb, odooUsername, odooPassword } }} />
        )}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Employees"
        component={(props) => (
          <Employees {...props} route={{ params: { odooUrl, odooDb, odooUsername, odooPassword } }} />
        )}
        options={{ title: 'Employees' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: 'bold' },
});
