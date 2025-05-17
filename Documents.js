// Documents.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function Documents({ route }) {
    const { jobId, jobTitle, odooUrl, odooDb, odooUsername, odooPassword } = route.params;
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            // Step 1: Authenticate
            const loginRes = await fetch(`${odooUrl}/jsonrpc`, {
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

            const loginData = await loginRes.json();
            const uid = loginData.result;
            if (!uid) throw new Error("Login failed");

            // Step 2: Get applicant IDs for this job
            const applicants = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'hr.applicant',
                method: 'search_read',
                args: [[['job_id', '=', parseInt(jobId)]]],
                kwargs: { fields: ['id'] },
            });




            const applicantIds = applicants.map((a) => a.id);
            if (applicantIds.length === 0) {
                setDocuments([]);
                setLoading(false);
                return;
            }

            // Step 3: Get related attachments (only safe fields)
            const docs = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'ir.attachment',
                method: 'search_read',
                args: [[
                    ['res_model', '=', 'hr.applicant'],
                    ['res_id', 'in', applicantIds]
                ]],
                kwargs: {
                    fields: ['id', 'name', 'res_name'],  // safe, readable fields
                },
            });

            const docList = docs.map((doc) => ({
                id: doc.id, // important!
                name: doc.name,
                applicant: doc.res_name || 'Unknown',
            }));


            setDocuments(docList);
        } catch (error) {
            console.error('Odoo Error:', error);
            Alert.alert("Odoo Server Error", error.message || "Failed to fetch documents.");
        } finally {
            setLoading(false);
        }
    };




    const callOdoo = async ({ url, db, uid, password, model, method, args, kwargs = {} }) => {
        const res = await fetch(`${url}/jsonrpc`, {
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
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    };
    const handleDownload = async (attachmentId, fileName) => {
        try {
            const loginRes = await fetch(`${odooUrl}/jsonrpc`, {
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

            const loginData = await loginRes.json();
            const uid = loginData.result;
            if (!uid) throw new Error("Login failed");

            const result = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'ir.attachment',
                method: 'read',
                args: [[attachmentId]],
                kwargs: { fields: ['datas', 'name'] },
            });

            const fileData = result[0];
            const base64Data = fileData.datas;
            const uri = FileSystem.documentDirectory + fileName;

            await FileSystem.writeAsStringAsync(uri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });

            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to download the document.');
        }
    };

    const handleHire = async (item) => {
        try {
            setLoading(true);

            const loginRes = await fetch(`${odooUrl}/jsonrpc`, {
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

            const loginData = await loginRes.json();
            const uid = loginData.result;
            if (!uid) throw new Error("Login failed");

            // Read the attachment to get the res_id (applicant ID)
            const attachment = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'ir.attachment',
                method: 'read',
                args: [[item.id]],
                kwargs: { fields: ['res_id'] },
            });

            const applicantId = attachment[0].res_id;
            if (!applicantId) throw new Error("Could not resolve applicant from attachment");

            // Read applicant info
            const applicant = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'hr.applicant',
                method: 'read',
                args: [[applicantId]],
                kwargs: { fields: ['partner_name', 'email_from', 'job_id', 'partner_phone'] },
            });

            const applicantData = applicant[0];

            // Create employee
            const newEmployeeId = await callOdoo({
                url: odooUrl,
                db: odooDb,
                uid,
                password: odooPassword,
                model: 'hr.employee',
                method: 'create',
                args: [{
                    name: applicantData.partner_name || "Unnamed",
                    work_email: applicantData.email_from || "",
                    job_id: applicantData.job_id ? applicantData.job_id[0] : false,
                    work_phone: applicantData.partner_phone || "",
                }],
            });


            Alert.alert("Success", `You Hired : ${applicantData.partner_name}`);
        } catch (error) {
            console.error("Hire Error:", error);
            Alert.alert("Error", error.message || "Failed to hire applicant.");
        } finally {
            setLoading(false);
        }
    };


    const renderItem = ({ item }) => (
        <View style={styles.docCard}>
            <TouchableOpacity onPress={() => handleDownload(item.id, item.name)}>
                <Text style={styles.docName}>{item.name}</Text>
                <Text style={styles.docMeta}>Applicant: {item.applicant}</Text>
                <Text style={styles.docLink}>Tap to open</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hireButton} onPress={() => handleHire(item)}>
                <Text style={styles.hireButtonText}>Hire</Text>
            </TouchableOpacity>
        </View>
    );


    return (
        <View style={styles.container}>
            <Text style={styles.header}>Attachements : {jobTitle}</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
            ) : documents.length === 0 ? (
                <Text style={styles.noDocs}>No documents found.</Text>
            ) : (
                <FlatList
                    data={documents}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderItem}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f9fa',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    docCard: {
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 2,
    },
    docName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    docMeta: {
        fontSize: 13,
        color: '#444',
        marginTop: 3,
    },
    docLink: {
        marginTop: 6,
        fontSize: 13,
        color: '#007bff',
        textDecorationLine: 'underline',
    },
    noDocs: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginTop: 30,
    },
    hireButton: {
        marginTop: 10,
        backgroundColor: '#28a745',
        paddingVertical: 8,
        borderRadius: 5,
        alignItems: 'center',
    },
    hireButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },

});
