import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen'; // Assuming you have LoginScreen in a separate file
import HomeScreen from './HomeScreen'; // New screen with bottom tab navigation
import Employees from './Employees';
import Enregistrement from './Enregistrement';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Employees" component={Employees} />
        <Stack.Screen name="Enregistrement" component={Enregistrement} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
