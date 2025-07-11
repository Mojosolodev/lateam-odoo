import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function AddJob({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
  const [jobName, setJobName] = useState('');
  const [jobSummary, setJobSummary] = useState('');
  const [departmentId, setDepartmentId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employmentTypeId, setEmploymentTypeId] = useState(null);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [skillsInput, setSkillsInput] = useState('');
  const [skillTypeId, setSkillTypeId] = useState(null);
  const [skillTypes, setSkillTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
          setDepartments(response.data.result);
        } else {
          console.error('No departments found:', response.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error.response?.data || error.message);
      }
    }

    async function fetchEmploymentTypes() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.contract.type',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (response.data.result) {
          setEmploymentTypes(response.data.result);
        } else {
          console.error('No employment types found:', response.data);
        }
      } catch (error) {
        console.error('Error fetching employment types:', error.response?.data || error.message);
      }
    }

    async function fetchSkillTypes() {
      try {
        const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'hr.skill.type',
            method: 'search_read',
            args: [[], ['id', 'name']],
            kwargs: {},
          },
        });
        if (response.data.result) {
          setSkillTypes(response.data.result);
        } else {
          console.error('No skill types found:', response.data);
        }
      } catch (error) {
        console.error('Error fetching skill types:', error.response?.data || error.message);
      }
    }

    fetchDepartments();
    fetchEmploymentTypes();
    fetchSkillTypes();
  }, []);

  async function handleAddJob() {
    if (!jobName || !departmentId || !employmentTypeId) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (Nom du poste, Département, Type d’emploi).');
      return;
    }
    if (skillsInput && !skillTypeId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de compétence pour les compétences saisies.');
      return;
    }

    setLoading(true);

    try {
      console.log('Authenticating with Odoo...');
      const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
        jsonrpc: '2.0',
        params: { db: odooDb, login: odooUsername, password: odooPassword },
      });

      if (!authResponse.data.result) {
        console.error('Authentication response:', authResponse.data);
        Alert.alert('Erreur', 'Échec de l’authentification avec Odoo.');
        return;
      }
      console.log('Authentication successful, session:', authResponse.data.result);

      // Process skills input
      let skillIds = [];
      if (skillsInput) {
        console.log('Processing skills:', skillsInput);
        const skills = skillsInput.split(',').map(skill => skill.trim()).filter(skill => skill);
        console.log('Parsed skills:', skills);

        for (const skill of skills) {
          console.log(`Searching for skill: ${skill}`);
          const searchResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.skill',
              method: 'search',
              args: [[['name', '=', skill], ['skill_type_id', '=', skillTypeId]]],
              kwargs: {},
            },
          });

          if (searchResponse.data.error) {
            console.error('Error searching skill:', searchResponse.data.error);
            throw new Error(searchResponse.data.error.message || 'Failed to search skill');
          }

          let skillId;
          if (searchResponse.data.result && searchResponse.data.result.length > 0) {
            skillId = searchResponse.data.result[0];
            console.log(`Found existing skill: ${skill}, ID: ${skillId}`);
          } else {
            console.log(`Creating new skill: ${skill}`);
            const createSkillResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
              jsonrpc: '2.0',
              method: 'call',
              params: {
                model: 'hr.skill',
                method: 'create',
                args: [{ name: skill, skill_type_id: skillTypeId }],
                kwargs: {},
              },
            });

            if (createSkillResponse.data.error) {
              console.error('Error creating skill:', createSkillResponse.data.error);
              throw new Error(createSkillResponse.data.error.message || 'Failed to create skill');
            }

            skillId = createSkillResponse.data.result;
            console.log(`Created skill: ${skill}, ID: ${skillId}`);
          }
          skillIds.push(skillId);
        }
      }
      console.log('Final skill IDs:', skillIds);

      // Create job with skills
      const jobData = {
        name: jobName,
        description: jobSummary,
        department_id: departmentId,
        contract_type_id: employmentTypeId,
      };
      if (skillIds.length > 0) {
        jobData.skill_ids = [[6, false, skillIds]];
      }
      console.log('Job data to create:', jobData);

      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'create',
          args: [jobData],
          kwargs: {},
        },
      });

      if (response.data.error) {
        console.error('Job creation error:', response.data.error);
        throw new Error(response.data.error.message || 'Failed to create job');
      }

      if (response.data.result) {
        console.log('Job created successfully, ID:', response.data.result);
        Alert.alert('Succès', 'Poste ajouté avec succès.');
        navigation.goBack();
      } else {
        console.error('Job creation response:', response.data);
        Alert.alert('Erreur', 'Impossible d’ajouter le poste.');
      }
    } catch (error) {
      console.error('Erreur lors de l’ajout du poste:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Une erreur est survenue.';
      Alert.alert('Erreur', `Échec de la création du poste: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Add New Job</Text>
        <TextInput
          style={styles.input}
          placeholder="Job Name"
          value={jobName}
          onChangeText={setJobName}
        />
        <Text style={styles.label}>Department:</Text>
        <Picker selectedValue={departmentId} onValueChange={setDepartmentId} style={styles.picker}>
          <Picker.Item label="Select Department" value={null} />
          {departments.map((dept) => (
            <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
          ))}
        </Picker>
        <Text style={styles.label}>Employment Type:</Text>
        <Picker selectedValue={employmentTypeId} onValueChange={setEmploymentTypeId} style={styles.picker}>
          <Picker.Item label="Select Employment Type" value={null} />
          {employmentTypes.map((type) => (
            <Picker.Item key={type.id} label={type.name} value={type.id} />
          ))}
        </Picker>
        <Text style={styles.label}>Skill Type:</Text>
        <Picker selectedValue={skillTypeId} onValueChange={setSkillTypeId} style={styles.picker}>
          <Picker.Item label="Select Skill Type" value={null} />
          {skillTypes.map((type) => (
            <Picker.Item key={type.id} label={type.name} value={type.id} />
          ))}
        </Picker>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Job Summary"
          value={jobSummary}
          onChangeText={setJobSummary}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.label}>Expected Skills:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Seperate Each skill with a Comma * , *"
          value={skillsInput}
          onChangeText={setSkillsInput}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleAddJob}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Create Job</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 1,
    fontWeight: 'bold',
  },
  input: {
    width: '90%',
    maxWidth: 400,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    width: '90%',
    maxWidth: 400,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
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