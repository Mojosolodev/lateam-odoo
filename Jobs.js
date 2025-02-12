import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { MaterialIcons } from '@expo/vector-icons';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function Jobs({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [jobPositionCount, setJobPositionCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  async function fetchJobCount() {
    try {
      setLoading(true);
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        Alert.alert('Erreur', 'Échec de l’authentification avec Odoo.');
        return;
      }

      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'search_count',
          args: [[]],
          kwargs: {},
        },
      });

      if (response.data.result) {
        setJobPositionCount(response.data.result);
      } else {
        Alert.alert('Erreur', 'Impossible de récupérer le nombre de postes.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des postes:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobCount();

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={fetchJobCount} style={{ marginRight: 26 }}>
          <MaterialIcons name="refresh" size={28} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Job Positions</Text>
          <Text style={styles.cardCount}>{jobPositionCount}</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate('AddJob', { odooUrl, odooDb, odooUsername, odooPassword })}
          >
            <Text style={styles.buttonText}>Add New Job</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
