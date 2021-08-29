const AWS = require('aws-sdk');
const { simpleParser } = require('mailparser');
const Iconv = require('iconv-lite');
const { config } = require('./config');

const s3 = new AWS.S3();

module.exports.inbox = async (event) => {
  console.log(event.Records[0]);

  if (
    event.Records &&
    event.Records[0] &&
    event.Records[0].ses &&
    event.Records[0].ses
  ) {
    const mail = event.Records[0].ses.mail;
    const receipt = event.Records[0].ses.receipt;

    if (!mail) {
      throw new Error('No mail object was provided.');
    }
    if (!receipt) {
      throw new Error('No receipt object was provided.');
    }

    const verdicts = [
      'spamVerdict',
      'virusVerdict',
      'spfVerdict',
      'dkimVerdict',
      'dmarcVerdict',
    ];
    for (let key of verdicts) {
      const verdict = receipt[key];
      if (verdict && verdict.status === 'FAIL') {
        throw new Error(`rejected by spam filter; ${key} = ${verdict.status}`);
      }
    }

    console.log('Parsing incoming email...');

    const { messageId } = mail;

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

      console.log(parsed);

      const {
        from,
        to,
        headerLines,
        attachments,
        html,
        subject,
        date,
        messageId,
      } = parsed;

      const { address, name } = from.value[0];

      if (
        address === 'me@nicholasgriffin.co.uk' &&
        name === 'Nicholas Griffin'
      ) {
        console.log('Processing message...');

        // TODO: categorise and process email here.

        const processed = {};

        processed.id = messageId;
        processed.date = date;
        processed.to = to;
        processed.from = from;
        processed.subject = subject;
        processed.headers = headerLines;
        processed.attachments = attachments;
        processed.html = html;
        processed.subject = subject;

        const categoryFound = config.emailToCategories.find(
          (category) => category.email === to.value[0].address
        );

        if (categoryFound) {
          const processedData = await s3
            .putObject({
              Bucket: categoryFound.bucket,
              Key: `${categoryFound.keyPrefix}${messageId}`,
              Body: JSON.stringify(processed),
              ContentType: 'application/json',
            })
            .promise();

          if (processedData) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: `${categoryFound.category} message processed into bucket: ${categoryFound.bucket} with the key: ${categoryFound.keyPrefix}${messageId}`,
                event,
              }),
            };
          }
        } else if (config.defaultCategory) {
          const processedData = await s3
            .putObject({
              Bucket: config.defaultCategory.bucket,
              Key: `${config.defaultCategory.keyPrefix}${messageId}`,
              Body: JSON.stringify(processed),
              ContentType: 'application/json',
            })
            .promise();

          if (processedData) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: `${config.defaultCategory.category} message processed into bucket: ${config.defaultCategory.bucket} with the key: ${config.defaultCategory.keyPrefix}${messageId}`,
                event,
              }),
            };
          }
        }
      } else {
        throw new Error('No no no!');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Internal server error');
    }
  }

  throw new Error('Incorrect event params!');
};
