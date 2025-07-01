const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Your Flutterwave secret key
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

app.post('/api/payment', async (req, res) => {
    const { senderNumber, amount, receiverName, receiverEmail } = req.body;

    if (!senderNumber || !amount || !receiverName || !receiverEmail) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    console.log("Request body:", {
        tx_ref: `tx-${Date.now()}`,
        amount: String(amount),
        currency: "XAF",
        payment_options: "mobilemoneycm",
        redirect_url: "https://google.com",
        customer: {
            email: receiverEmail,
            phonenumber: senderNumber,
            name: receiverName
        }
    });

    try {
        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref: `tx-${Date.now()}`,
                amount: String(amount),
                currency: "XAF",
                payment_options: "mobilemoneycm",
                redirect_url: "https://google.com",
                customer: {
                    email: receiverEmail,
                    phonenumber: senderNumber,
                    name: receiverName
                },
                customizations: {
                    title: "Salary Transfer",
                    description: `Transfer to ${receiverName}`
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Flutterwave payment response:", response.data);
        res.json({ success: true, data: response.data });

    } catch (error) {
        console.error("Payment initiation error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || "Failed to initiate payment",
            details: error.response?.data
        });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
