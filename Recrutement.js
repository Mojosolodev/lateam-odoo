import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Linking,
    TouchableOpacity,
    Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Switch } from 'react-native';


export default function Recrutement({ navigation, route }) {
    const { odooUrl, odooDb, odooUsername, odooPassword } = route.params;
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingJobId, setUpdatingJobId] = useState(null);


    useEffect(() => {
        authenticateAndFetchJobs();
    }, []);

    const authenticateAndFetchJobs = async () => {
        try {
            const loginResponse = await fetch(`${odooUrl}/jsonrpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    id: 1,
                    params: {
                        service: 'common',
                        method: 'login',
                        args: [odooDb, odooUsername, odooPassword],
                    },
                }),
            });

            const loginData = await loginResponse.json();
            const uid = loginData.result;

            if (!uid) throw new Error('Authentication failed');

            const jobs = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'hr.job',
                method: 'search_read',
                args: [],
                kwargs: {
                    fields: ['id', 'name', 'website_published', 'website_url'],
                },
            });

            const jobListWithCounts = await Promise.all(
                jobs.map(async (job) => {
                    const count = await callOdoo({
                        url: odooUrl,
                        db: odooDb,
                        uid,
                        password: odooPassword,
                        model: 'hr.applicant',
                        method: 'search_count',
                        args: [[['job_id', '=', job.id]]],
                    });

                    const link = `${odooUrl.replace(/\/$/, '')}/?db=${odooDb}#${job.website_url}`;
                    console.log('Generated Job Link:', link);

                    return {
                        id: job.id.toString(),
                        title: job.name,
                        applications: count,
                        link,
                        published: job.website_published,
                    };

                })
            );

            setJobs(jobListWithCounts);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to load jobs.");
        } finally {
            setLoading(false);
        }
    };

    async function callOdoo({ url, db, uid, password, model, method, args, kwargs = {} }) {
        const response = await fetch(`${url}/jsonrpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: Math.floor(Math.random() * 1000),
                params: {
                    service: 'object',
                    method: 'execute_kw',
                    args: [db, uid, password, model, method, args, kwargs],
                },
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    }

    const slugify = (text) =>
        text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const handleCopy = async (link) => {
        await Clipboard.setStringAsync(link);
        Alert.alert("Copied", "Link copied to clipboard!");
    };

    const handleShare = async (link) => {
        try {
            await Share.share({
                message: `Check out this job opening:\n${link}`,
            });
        } catch (error) {
            Alert.alert("Error", "Could not share the link.");
        }
    };
    const togglePublished = async (jobId, newStatus) => {
        setUpdatingJobId(jobId); // start spinner

        try {
            const loginResponse = await fetch(`${odooUrl}/jsonrpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    id: 1,
                    params: {
                        service: 'common',
                        method: 'login',
                        args: [odooDb, odooUsername, odooPassword],
                    },
                }),
            });

            const loginData = await loginResponse.json();
            const uid = loginData.result;

            await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'hr.job',
                method: 'write',
                args: [[parseInt(jobId)], { website_published: newStatus }],
            });

            // Immediately update UI instead of waiting
            setJobs((prevJobs) =>
                prevJobs.map((job) =>
                    job.id === jobId.toString() ? { ...job, published: newStatus } : job
                )
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to update publication status');
        } finally {
            setUpdatingJobId(null);
        }
    };



    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.jobCard}
            onPress={() =>
                navigation.navigate('Documents', {
                    jobId: item.id,
                    jobTitle: item.title,
                    odooUrl,
                    odooDb,
                    odooUsername,
                    odooPassword,
                })
            }
        >
            <View style={styles.iconRow}>
                <TouchableOpacity onPress={() => handleCopy(item.link)} style={styles.iconButton}>
                    <Ionicons name="copy" size={35} color="#808080" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleShare(item.link)} style={styles.iconButton}>
                    <Ionicons name="share-social" size={35} color="#3333ff" />
                </TouchableOpacity>
            </View>

            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.appCount}>
                Applications: <Text style={styles.appCountValue}>{item.applications}</Text>
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(item.link)}>
                <Text style={styles.link}>{item.link}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text>Hiring: </Text>
                {updatingJobId === item.id ? (
                    <ActivityIndicator size="small" color="#007bff" />
                ) : (
                    <Switch
                        value={item.published}
                        onValueChange={(newValue) => togglePublished(item.id, newValue)}
                        trackColor={{ false: '#ccc', true: 'lightgreen' }} // background color of the track
                        thumbColor={item.published ? 'green' : '#f4f3f4'}   // circle color
                    />

                )}
            </View>


        </TouchableOpacity>
    );


    return (
        <View style={styles.container}>
            <Text style={styles.header}>Job Positions</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
            ) : jobs.length === 0 ? (
                <Text style={styles.noJob}>First create a Job Position, then Hire.</Text>
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f0f8ff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 20,
    },
    jobCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 3,
        position: 'relative',
    },
    iconRow: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 20,
    },
    jobTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingRight: 40,
    },
    appCount: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    link: {
        marginTop: 6,
        fontSize: 12,
        color: '#1a0dab',
        textDecorationLine: 'underline',
    },
    appCountValue: {
        color: 'orange',
        fontWeight: 'bold',
    },
    noJob: {
        textAlign: 'center',
        fontSize: 16,
        color: 'orange',
        marginTop: 30,
    },

});
