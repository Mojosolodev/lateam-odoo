import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function EmployeeDetail({ route }) {
  const { employee } = route.params;

  function getImageSize(base64String) {
    return (base64String.length * (3 / 4)) - (base64String.endsWith("=") ? 1 : 0) - (base64String.endsWith("==") ? 1 : 0);
  }

  return (
    <View style={styles.container}>
      {employee.image_1920 && getImageSize(employee.image_1920) >= 5 * 1024 ? (
        <Image
          source={{ uri: `data:image/png;base64,${employee.image_1920}` }}
          style={styles.employeeImage}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {employee.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.name}>{employee.name}</Text>
      <Text style={styles.detail}>
        <Text style={styles.label}>Job Title: </Text>{employee.job_title || 'N/A'}
      </Text>
      <Text style={styles.detail}>
        <Text style={styles.label}>Mobile Phone: </Text>{employee.mobile_phone || 'N/A'}
      </Text>
      <Text style={styles.detail}>
        <Text style={styles.label}>Work Phone: </Text>{employee.work_phone || 'N/A'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  employeeImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
  },
  placeholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detail: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
  },
});
