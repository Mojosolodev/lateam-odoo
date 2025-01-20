import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MyTest from './MyTest';
import LoginScreen from './LoginScreen';

export default function App() {
  return (
    <>
      <View style={styles.container}>
        <LoginScreen/>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333333',
  }
});

