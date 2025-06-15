import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local first, then .env
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

import '@/ai/flows/recommend-stock-action.ts';
import '@/ai/flows/research-company-information.ts';
import '@/ai/flows/analyze-stock-data.ts';