import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Import your logos here (adjust path to your project structure)
import mtnLogo from './assets/mtn.png';
import orangeLogo from './assets/orange.png';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

export default function Payment({ route, navigation }) {
    const { odooUrl, odooDb, odooUsername, odooPassword } = route.params || {};
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    function getImageSize(base64String) {
        return (base64String.length * (3 / 4)) -
            (base64String.endsWith("=") ? 1 : 0) -
            (base64String.endsWith("==") ? 1 : 0);
    }

    function getOperatorLogo(number) {
        if (!number) return null;

        const cleanNumber = number.replace(/\D/g, '');

        const mtnPrefixes = ['67', '650', '651', '652', '653', '654', '680'];
        for (const prefix of mtnPrefixes) {
            if (cleanNumber.startsWith(prefix)) return mtnLogo;
        }

        const orangePrefixes = ['69', '655', '656', '657', '658', '659', '640', '686', '687', '688', '689'];
        for (const prefix of orangePrefixes) {
            if (cleanNumber.startsWith(prefix)) return orangeLogo;
        }

        return null;
    }
    function getOperatorColor(number) {
        if (!number) return null;
        const cleanNumber = number.replace(/\D/g, '');

        const mtnPrefixes = ['67', '650', '651', '652', '653', '654', '680'];
        for (const prefix of mtnPrefixes) {
            if (cleanNumber.startsWith(prefix)) return '#FFD700'; // Yellow for MTN
        }

        const orangePrefixes = ['69', '655', '656', '657', '658', '659', '640', '686', '687', '688', '689'];
        for (const prefix of orangePrefixes) {
            if (cleanNumber.startsWith(prefix)) return '#FF7F00'; // Orange for Orange
        }

        return null;
    }


    async function fetchData() {
        try {
            setLoading(true);

            // Authenticate
            const authResponse = await client.post(`${odooUrl}web/session/authenticate`, {
                jsonrpc: '2.0',
                params: { db: odooDb, login: odooUsername, password: odooPassword },
            });

            if (!authResponse.data.result) {
                Alert.alert('Error', 'Failed to authenticate with Odoo.');
                setLoading(false);
                return;
            }

            // Fetch employees
            const employeesResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'hr.employee',
                    method: 'search_read',
                    args: [[], ['id', 'name', 'mobile_phone', 'work_phone', 'image_1920']],
                    kwargs: {},
                },
            });

            const employeesData = employeesResponse.data.result || [];

            if (employeesData.length === 0) {
                setEmployees([]);
                setLoading(false);
                return;
            }

            // Fetch contracts by employee ids
            const employeeIds = employeesData.map(emp => emp.id);

            const contractsResponse = await client.post(`${odooUrl}web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    model: 'hr.contract',
                    method: 'search_read',
                    args: [[['employee_id', 'in', employeeIds]], ['id', 'employee_id', 'wage', 'date_start']],
                    kwargs: {},
                },
            });

            const contractsData = contractsResponse.data.result || [];

            // Map employeeId -> wage
            const wageMap = {};
            contractsData.forEach(contract => {
                const empId = contract.employee_id && contract.employee_id[0];
                if (empId) {
                    wageMap[empId] = {
                        wage: contract.wage,
                        date_start: contract.date_start
                    };
                }
            });


            // Merge wages into employees
            const merged = employeesData.map(emp => ({
                ...emp,
                wage: wageMap[emp.id]?.wage || 'N/A',
                date_start: wageMap[emp.id]?.date_start || 'N/A'
            }));


            setEmployees(merged);

        } catch (error) {
            console.error('Error:', error.response?.data || error.message);
            Alert.alert('Error', 'An error occurred while fetching employees or wages.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
            ) : employees.length > 0 ? (
                <FlatList
                    data={employees}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.employeeCard}>
                            <View style={styles.employeeImageContainer}>
                                {item.image_1920 && getImageSize(item.image_1920) >= 5 * 1024 ? (
                                    <Image
                                        source={{ uri: `data:image/png;base64,${item.image_1920}` }}
                                        style={styles.employeeImage}
                                    />
                                ) : (
                                    <Text style={styles.employeeInitial}>
                                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.employeeName}>{item.name}</Text>

                                <View style={styles.phoneRow}>
                                    <Text style={[styles.employeeMobile, { color: getOperatorColor(item.mobile_phone) || '#007bff' }]}>
                                        {item.mobile_phone || 'No Mobile Phone'}
                                    </Text>
                                    {getOperatorLogo(item.mobile_phone) && (
                                        <Image source={getOperatorLogo(item.mobile_phone)} style={styles.operatorLogo} />
                                    )}
                                </View>

                                <View style={styles.phoneRow}>
                                    <Text style={[styles.employeeWorkPhone, { color: getOperatorColor(item.work_phone) || '#009688' }]}>
                                        {item.work_phone || 'No Work Phone'}
                                    </Text>
                                    {getOperatorLogo(item.work_phone) && (
                                        <Image source={getOperatorLogo(item.work_phone)} style={styles.operatorLogo} />
                                    )}
                                </View>
                                <Text style={styles.contractDate}>
                                    Contract Start: {item.date_start !== 'N/A' ? item.date_start : 'N/A'}
                                </Text>

                                <Text style={styles.employeeWage}>Salary: {item.wage !== 'N/A' ? `${item.wage} FCFA` : 'N/A'}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.payButton}
                                onPress={() => navigation.navigate('Transfer', {
                                    employee: item,
                                    odooUrl,
                                    odooDb,
                                    odooUsername,
                                    odooPassword,
                                })}
                            >
                                <Text style={styles.payButtonText}>Pay</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                />
            ) : (
                <Text style={styles.noDataText}>No employees found.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f8f9fa' },
    employeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 3,
    },
    employeeImageContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007bff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    employeeImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    employeeInitial: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    employeeName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    employeeMobile: { fontSize: 14, color: '#007bff', marginRight: 8 },
    employeeWorkPhone: { fontSize: 14, color: '#009688', marginRight: 8 },
    operatorLogo: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
    },
    employeeWage: { fontSize: 14, color: '#00008B', marginTop: 4 },
    noDataText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
    payButton: {
        backgroundColor: '#28a745',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 5,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    contractDate: { fontSize: 14, color: '#555', marginTop: 4 },

});
