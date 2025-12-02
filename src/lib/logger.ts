import {
    CloudWatchLogsClient,
    PutLogEventsCommand,
    CreateLogStreamCommand,
    DescribeLogStreamsCommand
} from "@aws-sdk/client-cloudwatch-logs";

const isProduction = process.env.NODE_ENV === 'production';
const LOG_GROUP_NAME = '/aws/lightsail/containers/gspot-web';
const LOG_STREAM_NAME = `app-${new Date().toISOString().split('T')[0]}`;

let client: CloudWatchLogsClient | null = null;
let sequenceToken: string | undefined = undefined;
let logStreamCreated = false;

function getClient() {
    if (!client && isProduction) {
        client = new CloudWatchLogsClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWSCW_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWSCW_SECRET_ACCESS_KEY!,
            }
        });
    }
    return client;
}

async function ensureLogStream() {
    if (logStreamCreated || !isProduction) return;

    const cwClient = getClient();
    if (!cwClient) return;

    try {
        const describeCommand = new DescribeLogStreamsCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamNamePrefix: LOG_STREAM_NAME,
        });

        const describeResponse = await cwClient.send(describeCommand);

        if (describeResponse.logStreams && describeResponse.logStreams.length > 0) {
            sequenceToken = describeResponse.logStreams[0].uploadSequenceToken;
            logStreamCreated = true;
            return;
        }

        const createCommand = new CreateLogStreamCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamName: LOG_STREAM_NAME,
        });

        await cwClient.send(createCommand);
        logStreamCreated = true;
    } catch (error) {
        console.error('Failed to ensure log stream:', error);
    }
}

async function logToCloudWatch(
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    metadata?: Record<string, any>
) {
    const logMessage = `[${level}] ${message} ${metadata ? JSON.stringify(metadata) : ''}`;
    console.log(logMessage);

    if (!isProduction) return;

    const cwClient = getClient();
    if (!cwClient) return;

    try {
        await ensureLogStream();

        const logEvent = {
            message: JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                message,
                metadata: metadata || {},
            }),
            timestamp: Date.now(),
        };

        const command = new PutLogEventsCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamName: LOG_STREAM_NAME,
            logEvents: [logEvent],
            sequenceToken,
        });

        const response = await cwClient.send(command);
        sequenceToken = response.nextSequenceToken;
    } catch (error) {
        console.error('Failed to log to CloudWatch:', error);
    }
}

export async function loginfo(message: string, metadata?: Record<string, any>) {
    await logToCloudWatch('INFO', message, metadata);
}
export async function logerror(message: string, metadata?: Record<string, any>) {
    await logToCloudWatch('ERROR', message, metadata);
}