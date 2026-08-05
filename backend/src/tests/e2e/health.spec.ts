import { test, expect } from '@playwright/test';

test.describe('Health Checks', () => {
    test('should return healthy status', async ({ request }) => {
        const response = await request.get('/health');
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.status).toBe('healthy');
        expect(data.services.database.status).toBe('up');
    });

    test('should return ready status', async ({ request }) => {
        const response = await request.get('/health/ready');
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.status).toBe('ready');
    });

    test('should return alive status', async ({ request }) => {
        const response = await request.get('/health/live');
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.status).toBe('alive');
    });

    test('should return metrics', async ({ request }) => {
        const response = await request.get('/metrics');
        expect(response.ok()).toBeTruthy();
        
        const text = await response.text();
        expect(text).toContain('http_requests_total');
        expect(text).toContain('http_request_duration_seconds');
    });
});
