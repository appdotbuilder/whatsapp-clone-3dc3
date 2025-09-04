import { type PublicUser } from '../schema';

export async function getUsers(): Promise<PublicUser[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all users excluding sensitive data:
    // 1. Query all users from the database
    // 2. Exclude password_hash and email fields for privacy
    // 3. Return list of public user information
    // 4. Consider implementing pagination for large user bases
    return Promise.resolve([
        {
            id: 1,
            username: 'john_doe',
            full_name: 'John Doe',
            avatar_url: null,
            last_seen: new Date(),
            is_online: true
        },
        {
            id: 2,
            username: 'jane_smith',
            full_name: 'Jane Smith',
            avatar_url: null,
            last_seen: new Date(Date.now() - 300000), // 5 minutes ago
            is_online: false
        }
    ] as PublicUser[]);
}