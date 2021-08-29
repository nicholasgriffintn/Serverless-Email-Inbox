const AWS = require('aws-sdk');
const { simpleParser } = require('mailparser');
const { Iconv } = require('iconv');
const { config } = require('./config');

const s3 = new AWS.S3();

module.exports.inbox = async event => {
  console.log('Parsing incoming email...');
  const { messageId } = event.Records[0].ses.mail;
  const { date, from, subject, to } = event.Records[0].ses.mail.commonHeaders;

  console.log(`Date: ${date}`);
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);

  console.log(
    `Fetching email at s3://${config.bucket}/${config.keyPrefix}${messageId}`
  );

  try {
    const data = await s3
      .getObject({
        Bucket: config.bucket,
        Key: `${config.keyPrefix}${messageId}`,
      })
        .promise();
      
      const parsed = await simpleParser(data.Body, { Iconv });

      console.log('Parsing email...');

      console.log(parsed)

      const { address } = parsed.from.value[0];
      
      if (address === "me@nicholasgriffin.co.uk") {
          console.log('Processing message...');

          // TODO: categorise and process email here.

          return {
              statusCode: 200,
              body: JSON.stringify({ message: response, event }),
          };
      } else {
          throw new Error('No no no!');
      }
  } catch (error) {
    console.error(error);
    throw new Error('Internal server error');
  }
};