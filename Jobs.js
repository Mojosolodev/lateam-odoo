import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { MaterialIcons,FontAwesome } from '@expo/vector-icons';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function Jobs({ route }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [jobPositionCount, setJobPositionCount] = useState(null);
  const [departmentCount, setDepartmentCount] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs'); // Default to jobs tab
  const navigation = useNavigation();

  async function fetchCounts() {
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

      const jobResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'search_count',
          args: [[]],
          kwargs: {},
        },
      });

      const departmentResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.department',
          method: 'search_count',
          args: [[]],
          kwargs: {},
        },
      });

      const jobCount = jobResponse.data.result;
      const departmentCount = departmentResponse.data.result;

      setJobPositionCount(typeof jobCount === 'number' ? jobCount : 0);
      setDepartmentCount(typeof departmentCount === 'number' ? departmentCount : 0);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployeeCounts(departments) {
    try {
      const counts = await Promise.all(
        departments.map(async (dept) => {
          const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.employee',
              method: 'search_count',
              args: [[['department_id', '=', dept.id]]],
              kwargs: {},
            },
          });

          const count = response.data.result;
          return { ...dept, employeeCount: typeof count === 'number' ? count : 0 };
        })
      );

      setDepartments(counts);
    } catch (error) {
      console.error("Error fetching employee counts:", error);
    }
  }

  async function fetchDepartments() {
    try {
      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.department',
          method: 'search_read',
          args: [[], ['id', 'name']],
          kwargs: {},
        },
      });

      if (response.data.result) {
        console.log("Fetched Departments:", response.data.result);
        fetchEmployeeCounts(response.data.result);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function fetchJobs() {
    try {
      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'search_read',
          args: [[], ['id', 'name', 'no_of_employee', 'department_id', 'description', 'skill_ids']],
          kwargs: {},
        },
      });

      if (response.data.result) {
        console.log("Fetched Jobs:", response.data.result);
        setJobs(response.data.result);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  }

  async function handleDeleteDepartment(departmentId, departmentName) {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer le département "${departmentName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
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
                  model: 'hr.department',
                  method: 'unlink',
                  args: [[departmentId]],
                  kwargs: {},
                },
              });

              if (response.data.error) {
                console.error('Error deleting department:', response.data.error);
                throw new Error(response.data.error.message || 'Failed to delete department');
              }

              if (response.data.result) {
                console.log(`Department ${departmentName} deleted successfully`);
                Alert.alert('Succès', `Le département "${departmentName}" a été supprimé.`);
                await fetchDepartments();
                await fetchCounts();
              } else {
                console.error('Department deletion response:', response.data);
                Alert.alert('Erreur', 'Impossible de supprimer le département.');
              }
            } catch (error) {
              console.error('Erreur lors de la suppression du département:', error.response?.data || error.message);
              const errorMessage = error.response?.data?.error?.message || error.message || 'Une erreur est survenue.';
              Alert.alert('Erreur', `Échec de la suppression: ${errorMessage}`);
            }
          },
        },
      ]
    );
  }

  async function handleDeleteJob(jobId, jobName) {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer le poste "${jobName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
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
                  method: 'unlink',
                  args: [[jobId]],
                  kwargs: {},
                },
              });

              if (response.data.error) {
                console.error('Error deleting job:', response.data.error);
                throw new Error(response.data.error.message || 'Failed to delete job');
              }

              if (response.data.result) {
                console.log(`Job ${jobName} deleted successfully`);
                Alert.alert('Succès', `Le poste "${jobName}" a été supprimé.`);
                await fetchJobs();
                await fetchCounts();
              } else {
                console.error('Job deletion response:', response.data);
                Alert.alert('Erreur', 'Impossible de supprimer le poste.');
              }
            } catch (error) {
              console.error('Erreur lors de la suppression du poste:', error.response?.data || error.message);
              const errorMessage = error.response?.data?.error?.message || error.message || 'Une erreur est survenue.';
              Alert.alert('Erreur', `Échec de la suppression: ${errorMessage}`);
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    fetchCounts();
    fetchDepartments();
    fetchJobs();
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            fetchCounts();
            fetchDepartments();
            fetchJobs();
          }}
          style={{ marginRight: 26 }}
        >
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
        <>
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Job Positions</Text>
              <Text style={styles.cardCount}>{jobPositionCount}</Text>
              <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddJob', { odooUrl, odooDb, odooUsername, odooPassword })}
              >
                <MaterialIcons name="add" size={30} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Departments</Text>
              <Text style={styles.cardCount}>{departmentCount}</Text>
              <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddDepartment', { odooUrl, odooDb, odooUsername, odooPassword })}
              >
                <MaterialIcons name="add" size={30} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'jobs' ? styles.activeTab : styles.inactiveTab]}
              onPress={() => setActiveTab('jobs')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'jobs' ? styles.activeTabText : styles.inactiveTabText]}>
                Jobs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'departments' ? styles.activeTab : styles.inactiveTab]}
              onPress={() => setActiveTab('departments')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'departments' ? styles.activeTabText : styles.inactiveTabText]}>
                Departments
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.choicesContainer}>
            <Text style={styles.choiceButtonText}>
              {activeTab === 'jobs'
                ? jobPositionCount === 0
                  ? 'No jobs, Create One'
                  : 'List of jobs'
                : departmentCount === 0
                ? 'No department, Create One'
                : 'List of departments'}
            </Text>
          </View>
          <FlatList
            data={activeTab === 'jobs' ? jobs : departments}
            style={styles.listContainer}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemText}>{item.name}</Text>
                  {activeTab === 'jobs' ? (
                    <Text style={styles.employeeCount}>({item.no_of_employee} employees)</Text>
                  ) : (
                    <Text style={styles.employeeCount}>({item.employeeCount} employees)</Text>
                  )}
                </View>
                {activeTab === 'jobs' ? (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('UpdateJob', {
                          odooUrl,
                          odooDb,
                          odooUsername,
                          odooPassword,
                          jobId: item.id,
                          jobName: item.name,
                          departmentId: item.department_id ? item.department_id[0] : null,
                          jobSummary: item.description || '',
                          skillIds: item.skill_ids || [],
                        })
                      }
                    >
                      <FontAwesome name="edit" size={24} color="#FFA500" style={styles.editButton} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteJob(item.id, item.name)}
                    >
                      <MaterialIcons name="delete" size={24} color="#ff0000" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteDepartment(item.id, item.name)}
                  >
                    <MaterialIcons name="delete" size={24} color="#ff0000" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#e6ffff',
    padding: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 800,
    marginTop: 20,
  },
  card: {
    flex: 1,
    padding: 5,
    top: -30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    elevation: 5,
    alignItems: 'center',
    marginHorizontal: 5,
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
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 3,
    width: '100%',
    maxWidth: 800,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  inactiveTab: {
    backgroundColor: '#d3d3d3',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#ffffff',
  },
  inactiveTabText: {
    color: '#333',
  },
  choicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  choiceButtonText: {
    textAlign: 'center',
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
    width: '110%',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    width: '90%',
    alignSelf: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  employeeCount: {
    fontSize: 15,
    color: 'blue',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 10,
  },
  deleteButton: {
    padding: 10,
  },
  fab: {
    backgroundColor: '#FFA500',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    top: -5,
  },
});