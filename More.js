import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const options = [
  { id: '1', title: 'Profile', icon: 'person-circle', description: 'Manage your profile' },
  { id: '2', title: 'Settings', icon: 'settings', description: 'Adjust preferences' },
  { id: '3', title: 'Notifications', icon: 'notifications', description: 'View alerts' },
  { id: '4', title: 'Help', icon: 'help-circle', description: 'Get support' },
  { id: '5', title: 'About Us', icon: 'information-circle', description: 'Learn more about us' },
  { id: '6', title: 'Logout', icon: 'log-out', description: 'Sign out of your account', color: '#ff4d4d' },
];

export default function More({ navigation }) {
    const handlePress = (item) => {
        if (item.title === 'Logout') {
          Alert.alert(
            "Confirm Logout",
            "Are you sure you want to log out?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Yes", 
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }], // Réinitialisation de la navigation
                  });
                }
              },
            ]
          );
        } else {
          alert(`Navigating to ${item.title}`);
        }
      };
      

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePress(item)}
    >
      <Ionicons name={item.icon} size={50} color={item.color || "#ffffff"} />
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
  },
  list: {
    paddingHorizontal: 15,
  },
  card: {
    backgroundColor: '#007bff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: '#d1e7ff',
    marginTop: 5,
    textAlign: 'center',
  },
});
