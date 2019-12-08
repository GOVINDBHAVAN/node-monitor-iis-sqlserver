import nodemailer from "nodemailer";
import Mail from 'nodemailer/lib/mailer';
import log from '../config/log';
import { isdev } from '../util';
import config from '../config/config';
import Email from 'email-templates';

export const DefaultRecipient: Mail.Options = {
    from: config['EMAIL_USER'], // sender address
    to: config['EMAIL_TO'], // list of receivers
    subject: "Hello", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>" // html body
};


// async..await is not allowed in global scope, must use a wrapper
async function sendTest(mailOptions: Mail.Options = this.DefaultRecipient) {
    // Generate test SMTP service account from ethereal.emaDil
    // Only needed if you don't have a real mail account for testing
    let transporter = await mailTransportForDevelopment();

    try {
        // send mail with defined transport object
        let info = await transporter.sendMail(mailOptions);

        log.info("Message sent: %s", info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

        // Preview only available when sending through an Ethereal account
        log.info("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    } catch (err) {
        log.error("Error:", err)
    }
}

// async..await is not allowed in global scope, must use a wrapper
export async function sendActual(mailOptions: Mail.Options) {

    // create reusable transporter object using the default SMTP transport
    let transporter = mailTransportForProduction();

    // send mail with defined transport object
    // let info = await transporter.sendMail(mailOptions, function (err, info) {
    //     if (err)
    //         console.log(err)
    //     else
    //         console.log(info);
    // });
    try {
        let info = await transporter.sendMail(mailOptions);

        log.info("Message sent: %s", info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

        // Preview only available when sending through an Ethereal account
        log.info("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    } catch (err) {
        log.error("Error:", err)
    }
}

async function mailTransportForDevelopment() {
    let testAccount = await nodemailer.createTestAccount();
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass // generated ethereal password
        }
    });
    return transporter;
}

function mailTransportForProduction() {
    const { EMAIL_USERNAME, EMAIL_PASSWORD } = config;
    return nodemailer.createTransport({
        service: 'gmail',
        // host: 'smtp.gmail.com',
        // port: 465, // Port
        // secure: true, // this is true as port is 465
        auth: {
            user: EMAIL_USERNAME,
            pass: EMAIL_PASSWORD,
        },
    });
}


/** Create the Email object to compose and send email with template */
export function createEmail() {
    const email = new Email({
        message: {
            from: config['EMAIL_USER'],
        },
        // uncomment below to send emails in development/test env:
        send: isdev,
        transport: {
            jsonTransport: true,
        }
    });
    return email;
}
export async function send(mailOptions: Mail.Options = this.DefaultRecipient) {
    if (isdev) {
        return sendTest(mailOptions);
    } else {
        return sendActual(mailOptions);
    }
}