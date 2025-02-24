import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import Employees from './Employees';
import Enregistrement from './Enregistrement';
import UpdateEmployee from './UpdateEmployee';
import EmployeeDetail from './EmployeeDetails';
import More from './More';
import AddJob from './AddJob';
import AddDepartment from './AddDepartment';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }} // Hides the top bar for Home
        />
        <Stack.Screen name="Employees" component={Employees} />
        <Stack.Screen name="Enregistrement" component={Enregistrement} />
        <Stack.Screen name="UpdateEmployee" component={UpdateEmployee} />
        <Stack.Screen name="EmployeeDetail" component={EmployeeDetail} />
        <Stack.Screen name="AddJob" component={AddJob} />
        <Stack.Screen name="AddDepartment" component={AddDepartment} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
