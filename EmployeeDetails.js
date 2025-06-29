import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function EmployeeDetail({ route }) {
  const { employee, odooUrl, odooDb, odooUsername, odooPassword } = route.params;
  const [wage, setWage] = useState(null);
  const [startDate, setStartDate] = useState(null);

  useEffect(() => {
    const fetchWage = async () => {
      try {
        // Authenticate
        await client.post(`${odooUrl}web/session/authenticate`, {
          jsonrpc: '2.0',
          params: { db: odooDb, login: odooUsername, password: odooPassword },
        });

        // Search for contracts linked to employee
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.contract',
            method: 'search_read',
            args: [[['employee_id', '=', employee.id]], ['wage', 'date_start']],
            kwargs: { limit: 1, order: 'date_start desc' },
          },
        });

        const result = response.data.result;
        if (result && result.length > 0) {
          setWage(result[0].wage+"FCFA");
          setStartDate(result[0].date_start);
        } else {
          setWage('No contract found');
          setStartDate('N/A');
        }
      } catch (error) {
        console.error('Failed to fetch wage:', error.response?.data || error.message);
        setWage('Error fetching wage');
      }
    };

    fetchWage();
  }, [employee.id]);

  function getImageSize(base64String) {
    return (base64String.length * (3 / 4)) - (base64String.endsWith("=") ? 1 : 0) - (base64String.endsWith("==") ? 1 : 0);
  }

  const handlePhoneCall = (phoneNumber) => {
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  return (
    <View style={styles.container}>
      {employee.image_1920 && getImageSize(employee.image_1920) >= 5 * 1024 ? (
        <Image source={{ uri: `data:image/png;base64,${employee.image_1920}` }} style={styles.employeeImage} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {employee.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.name}>{employee.name}</Text>
      <Text style={styles.detail}><Text style={styles.label}>Job Title: </Text>{employee.job_title || 'N/A'}</Text>

      <View style={styles.phoneContainer}>
        <Text style={styles.detail}><Text style={styles.label}>Mobile Phone: </Text>{employee.mobile_phone || 'N/A'}</Text>
        {employee.mobile_phone && (
          <TouchableOpacity onPress={() => handlePhoneCall(employee.mobile_phone)}>
            <Ionicons name="call" size={20} color="#007bff" style={styles.icon} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.phoneContainer}>
        <Text style={styles.detail}><Text style={styles.label}>Work Phone: </Text>{employee.work_phone || 'N/A'}</Text>
        {employee.work_phone && (
          <TouchableOpacity onPress={() => handlePhoneCall(employee.work_phone)}>
            <Ionicons name="call" size={20} color="#007bff" style={styles.icon} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.phoneContainer}>
        <Text style={styles.detail}><Text style={styles.label}>Work Email: </Text>{employee.work_email || 'N/A'}</Text>
        {employee.work_email && (
          <TouchableOpacity onPress={() => handleEmail(employee.work_email)}>
            <Ionicons name="mail" size={20} color="#007bff" style={styles.icon} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.detail}><Text style={styles.label}>Department: </Text>{employee.department_id[1] || 'N/A'}</Text>
      <Text style={styles.detail}><Text style={styles.label}>Job Position: </Text>{employee.job_id[1] || 'N/A'}</Text>
      <Text style={styles.detail}><Text style={styles.label}>Manager: </Text>{employee.manager_id || 'N/A'}</Text>
      <Text style={styles.detail}><Text style={styles.label}>Coach: </Text>{employee.coach_id[1] || 'N/A'}</Text>

      <Text style={styles.detail}>
        <Text style={styles.label}>Contract Start Date: </Text>
        {startDate !== null ? startDate : 'Loading...'}
      </Text>

      <Text style={styles.detail}>
        <Text style={styles.label}>Salary: </Text>
        {wage !== null ? wage : 'Loading...'}
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
    marginTop: 10,
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  icon: {
    marginLeft: 5,
  },
});
