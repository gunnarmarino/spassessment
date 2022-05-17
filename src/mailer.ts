import nodemailer from "nodemailer";

//I didn't put much work into this for a lack of time.
/*

    In a larger codebase I'd assume we'd already have a more generic mailer written.
    Then I'd likely write a class which extends that mailer with methods for sending specific alerts like outOfBoundsAlert and noResponseAlert
    I would have throttled the outOfBoundsAlert for each sprinterID (so we wont get alerts for the same sprinterID over and over)
    noResponseAlert should be written differently where we get an alert when an endpoint fails and when it becomes available again.
    noResponseAlert would likely become useful in other cases and the logic could be moved.

*/

class Mailer {
    transporter: any;
    testAccount: any;

    constructor(){

    }

    async init(callback: Function){
        // Generate test SMTP service account from ethereal.email
        this.testAccount = await nodemailer.createTestAccount();

        // create reusable transporter object using the default SMTP transport
        this.transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
            user: this.testAccount.user, // generated ethereal user
            pass: this.testAccount.pass, // generated ethereal password
            },
        });
        callback();
    }

    private async send(recipients: string, subject: string, body: string){
        let info = await this.transporter.sendMail({
            from: '"Fred Foo 👻" <foo@example.com>',
            to: recipients, // list of receivers
            subject: subject, 
            text: body,
        });
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    async outOfBoundsAlert(recipients: string, sprinterID: string){
        let subject = `Sprinter ${sprinterID} out of bounds!`
        let body = `The sprinter with ID ${sprinterID} is out of bounds`
        this.send(recipients, subject, body)
    }

    async noResponseAlert(recipients: string, sprinterID: string){
        let subject = `No response for ${sprinterID}!`
        let body = `There was no response when requesting the location of sprinter with ID ${sprinterID}`
        this.send(recipients, subject, body)
    }
}

export default Mailer;