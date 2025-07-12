import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function Documents({ route }) {
    const { jobId, jobTitle, odooUrl, odooDb, odooUsername, odooPassword, skills, department_id } = route.params;
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

            // Step 3: Get attachments + phone numbers
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
                    fields: ['id', 'name', 'res_name', 'res_id'],
                },
            });

            const fullDocs = await Promise.all(docs.map(async (doc) => {
                let phone = '';
                let email = '';
                let applicantName = doc.res_name || 'Unknown';

                try {
                    const applicantResult = await callOdoo({
                        url: odooUrl,
                        db: odooDb,
                        uid,
                        password: odooPassword,
                        model: 'hr.applicant',
                        method: 'read',
                        args: [[doc.res_id]],
                        kwargs: { fields: ['partner_phone', 'email_from', 'partner_name'] },
                    });

                    const applicant = applicantResult[0];
                    phone = applicant?.partner_phone || '';
                    email = applicant?.email_from || '';
                    applicantName = applicant?.partner_name || applicantName;

                } catch (e) {
                    console.warn("Error fetching applicant info for doc", doc.id, e);
                }

                return {
                    id: doc.id,
                    name: doc.name,
                    applicant: applicantName,
                    phone,
                    email,
                    res_id: doc.res_id,
                };
            }));

            setDocuments(fullDocs);
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
        Alert.alert(
            "Confirm Hire",
            `Are you sure you want to hire ${item.applicant}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Hire",
                    style: "default",
                    onPress: async () => {
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

                            const attachment = await callOdoo({
                                url: odooUrl,
                                db: odooDb,
                                uid,
                                password: odooPassword,
                                model: 'ir.attachment',
                                method: 'read',
                                args: [[item.id]],
                                kwargs: { fields: ['res_id', 'datas', 'name'] },
                            });

                            const applicantId = attachment[0].res_id;
                            const pdfBase64 = attachment[0].datas;
                            if (!applicantId || !pdfBase64) throw new Error("Invalid attachment or applicant ID");

                            const response = await fetch("https://lateam-odoo.onrender.com/extract-photo", {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pdf_base64: pdfBase64 }),
                            });

                            const imageResult = await response.json();
                            const imageBase64 = imageResult.image_base64;

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

                            const employeeData = {
                                name: applicantData.partner_name || "Unnamed",
                                work_email: applicantData.email_from || "",
                                job_id: applicantData.job_id ? applicantData.job_id[0] : false,
                                work_phone: applicantData.partner_phone || "",
                                department_id: department_id || false,
                            };

                            if (imageBase64) {
                                employeeData.image_1920 = imageBase64;
                            }

                            const newEmployeeId = await callOdoo({
                                url: odooUrl,
                                db: odooDb,
                                uid,
                                password: odooPassword,
                                model: 'hr.employee',
                                method: 'create',
                                args: [employeeData],
                            });

                            // Delete the applicant record after successful hire
                            await callOdoo({
                                url: odooUrl,
                                db: odooDb,
                                uid,
                                password: odooPassword,
                                model: 'hr.applicant',
                                method: 'unlink',
                                args: [[applicantId]],
                            });

                            // Update the documents list by removing the hired application
                            setDocuments(documents.filter(doc => doc.res_id !== applicantId));

                            Alert.alert("Success", `You Hired: ${applicantData.partner_name}`);
                        } catch (error) {
                            console.error("Hire Error:", error);
                            Alert.alert("Error", error.message || "Failed to hire applicant.");
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (item) => {
        Alert.alert(
            "Confirm Rejection",
            `Are you sure you want to reject the application from ${item.applicant}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
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

                            // Delete the applicant record
                            await callOdoo({
                                url: odooUrl,
                                db: odooDb,
                                uid,
                                password: odooPassword,
                                model: 'hr.applicant',
                                method: 'unlink',
                                args: [[item.res_id]],
                            });

                            // Update the documents list by removing the rejected application
                            setDocuments(documents.filter(doc => doc.res_id !== item.res_id));

                            Alert.alert("Success", `Application from ${item.applicant} has been rejected.`);
                        } catch (error) {
                            console.error("Reject Error:", error);
                            Alert.alert("Error", error.message || "Failed to reject applicant.");
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.docCard}>
            <TouchableOpacity onPress={() => handleDownload(item.id, item.name)}>
                <Text style={styles.docName}>{item.name}</Text>
                <Text style={styles.docMeta}>Applicant: {item.applicant}</Text>
                <Text style={styles.docLink}>Tap to open</Text>
            </TouchableOpacity>

            {item.phone ? (
                <View style={styles.row}>
                    <Text style={styles.rowText}>📞 {item.phone}</Text>
                    <TouchableOpacity
                        style={styles.rowButton}
                        onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                        <Text style={styles.rowButtonText}>Call</Text>
                    </TouchableOpacity>
                </View>
            ) : <Text style={styles.noPhone}>No phone number</Text>}

            {item.email ? (
                <View style={styles.row}>
                    <Text style={styles.rowText}>📧 {item.email}</Text>
                    <TouchableOpacity
                        style={[styles.rowButton, { backgroundColor: '#6f42c1' }]}
                        onPress={() => Linking.openURL(`mailto:${item.email}`)}
                    >
                        <Text style={styles.rowButtonText}>Email</Text>
                    </TouchableOpacity>
                </View>
            ) : <Text style={styles.noPhone}>No email address</Text>}

            <TouchableOpacity style={styles.hireButton} onPress={() => handleHire(item)}>
                <Text style={styles.hireButtonText}>Hire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.hireButton, { backgroundColor: '#dc3545' }]} onPress={() => handleReject(item)}>
                <Text style={styles.hireButtonText}>Reject</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Applications : {jobTitle}</Text>
            <View style={styles.skillsCard}>
                <Text style={styles.skillsTitle}>Expected Skills</Text>
                {skills && skills.length > 0 ? (
                    <View style={styles.skillsContainer}>
                        {skills.map((skill, index) => (
                            <Text key={index} style={styles.skillTag}>{skill}</Text>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.noSkills}>No skills specified</Text>
                )}
            </View>
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
        backgroundColor: '#ffebe6',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    skillsCard: {
        backgroundColor: '#ffb3d9',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 2,
    },
    skillsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillTag: {
        backgroundColor: '#e0f7fa',
        color: '#007bff',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 15,
        marginRight: 8,
        marginBottom: 8,
        fontSize: 12,
    },
    noSkills: {
        fontSize: 13,
        color: '#ff3300',
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    rowText: {
        fontSize: 14,
        color: '#222',
        flex: 1,
        marginRight: 10,
    },
    rowButton: {
        backgroundColor: '#007bff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
    },
    rowButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    noPhone: {
        fontSize: 13,
        color: '#999',
        marginTop: 6,
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
    noDocs: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginTop: 30,
    },
});