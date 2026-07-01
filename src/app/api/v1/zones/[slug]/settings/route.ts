import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveZoneContext, canManage } from '@/app/api/v1/_utils/zone';
import { getZoneSettings, updateZoneSettings } from '@/lib/zones';
import { getZoneTags } from '@/lib/tags';
import { getZoneUploadRules, DEFAULT_ZONE_UPLOAD_RULES } from '@/lib/zone-upload-rules';
import { logerror } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;
    if (!canManage(ctx.member?.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const [settings, tags] = await Promise.all([
      getZoneSettings(ctx.zone.id),
      getZoneTags(ctx.zone.id),
    ]);

    return NextResponse.json({
      description: ctx.zone.description ?? '',
      uploadRules: getZoneUploadRules(settings?.upload_rules),
      tags,
    });
  } catch (err) {
    await logerror('GET /api/v1/zones/[slug]/settings error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  description: z.string().max(1500).default(''),
  uploadRules: z.array(z.string()).max(20).default([]),
});

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const { ctx, response } = await resolveZoneContext(req, slug);
    if (response) return response;
    if (!canManage(ctx.member?.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const rules = parsed.data.uploadRules.map((r) => r.trim()).filter((r) => r.length > 0).slice(0, 20);
    const nextRules = rules.length > 0 ? rules : DEFAULT_ZONE_UPLOAD_RULES;

    const currentSettings = await getZoneSettings(ctx.zone.id);
    const guessScoringRules = typeof currentSettings?.guess_scoring_rules === 'string'
      ? currentSettings.guess_scoring_rules
      : JSON.stringify(currentSettings?.guess_scoring_rules ?? {});

    const saved = await updateZoneSettings(ctx.zone.id, {
      description: parsed.data.description.trim(),
      join_policy: ctx.zone.join_policy,
      upload_rules: JSON.stringify(nextRules),
      guess_scoring_rules: guessScoringRules,
    });

    if (!saved) {
      return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ description: parsed.data.description.trim(), uploadRules: nextRules });
  } catch (err) {
    await logerror('PATCH /api/v1/zones/[slug]/settings error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
