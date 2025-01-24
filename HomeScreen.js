import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

export default function Dashboard({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {}; // Handle undefined route.params

  if (!odooUrl || !odooDb || !odooUsername || !odooPassword) {
    console.error('Missing credentials in Dashboard. Ensure parameters are passed correctly.');
    return (
      <View style={styles.screen}>
        <Text style={{ color: 'red' }}>Error: Missing credentials. Please log in again.</Text>
      </View>
    );
  }
  else{
    alert("Transmitted data from login\n"+odooUrl+odooDb+odooUsername+odooPassword);
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('Employees', {
            odooUrl,
            odooDb,
            odooUsername,
            odooPassword,
          })
        }
      >
        <Text style={styles.cardText}>Employees</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#007bff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: 200,
    elevation: 5,
  },
  cardText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
