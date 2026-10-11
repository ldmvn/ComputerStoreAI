import * as svc from '../services/storeSetting.service.js';

const err = (res, e) => {
  const status = e?.status ?? e?.statusCode ?? 500;
  res.status(status).json({ success: false, message: e.message });
};

export async function getAll(req, res) {
  try {
    const data = await svc.getAllSettings();
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
}

export async function getPublicStore(req, res) {
  try {
    const data = await svc.getSettingsByPrefix('store.');
    const social = await svc.getSettingsByPrefix('social.');
    const footer = await svc.getSettingsByPrefix('footer.');
    res.json({ success: true, data: { ...data, ...social, ...footer } });
  } catch (e) { err(res, e); }
}

export async function update(req, res) {
  try {
    await svc.setSettings(req.body);
    res.json({ success: true, message: 'Đã lưu cài đặt.' });
  } catch (e) { err(res, e); }
}
