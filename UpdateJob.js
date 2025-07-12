import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function UpdateJob({ route, navigation }) {
  const { odooUrl, odooDb, odooUsername, odooPassword, jobId, jobName, departmentId, jobSummary, skillIds } = route.params || {};
  const [name, setName] = useState(jobName || '');
  const [summary, setSummary] = useState(jobSummary || '');
  const [newDepartmentId, setNewDepartmentId] = useState(departmentId || null);
  const [departments, setDepartments] = useState([]);
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

    async function fetchCurrentSkills() {
      if (skillIds && skillIds.length > 0) {
        try {
          const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'hr.skill',
              method: 'search_read',
              args: [[['id', 'in', skillIds]], ['name']],
              kwargs: {},
            },
          });
          if (response.data.result) {
            const skillNames = response.data.result.map(skill => skill.name).join(', ');
            setSkillsInput(skillNames);
          }
        } catch (error) {
          console.error('Error fetching current skills:', error.response?.data || error.message);
        }
      }
    }

    fetchDepartments();
    fetchSkillTypes();
    fetchCurrentSkills();
  }, []);

  async function handleUpdateJob() {
    if (!name || !newDepartmentId) {
      Alert.alert('Error', 'Fill all the Information required.');
      return;
    }
    if (skillsInput && !skillTypeId) {
      Alert.alert('Error', 'Select a Skill Type.');
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

      // Update job
      const jobData = {
        name,
        description: summary,
        department_id: newDepartmentId,
      };
      if (skillIds.length > 0) {
        jobData.skill_ids = [[6, false, skillIds]];
      }
      console.log('Job data to update:', jobData);

      const response = await client.post(`${odooUrl}web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.job',
          method: 'write',
          args: [[jobId], jobData],
          kwargs: {},
        },
      });

      if (response.data.error) {
        console.error('Job update error:', response.data.error);
        throw new Error(response.data.error.message || 'Failed to update job');
      }

      if (response.data.result) {
        console.log('Job updated successfully, ID:', jobId);
        Alert.alert('Success', 'Job Updated Successfully.');
        navigation.goBack();
      } else {
        console.error('Job update response:', response.data);
        Alert.alert('Error', 'Cant Update Job.');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du poste:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Une erreur est survenue.';
      Alert.alert('Error', `Error during update: ${errorMessage}`);
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
        <Text style={styles.title}>Update Job</Text>
        <TextInput
          style={styles.input}
          placeholder="Job Name"
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Department:</Text>
        <Picker selectedValue={newDepartmentId} onValueChange={setNewDepartmentId} style={styles.picker}>
          <Picker.Item label="Select Department" value={null} />
          {departments.map((dept) => (
            <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
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
          value={summary}
          onChangeText={setSummary}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.label}>Expected Skills:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Separate each skill with a comma * , *"
          value={skillsInput}
          onChangeText={setSkillsInput}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleUpdateJob}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Update Job</Text>
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