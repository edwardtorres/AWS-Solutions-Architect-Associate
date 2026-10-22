import { expect, test } from '@playwright/test';
import { axeClean } from './helpers';

/** An iPhone's Safari user agent, so Settings shows the iOS install steps rather than the generic note. */
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test.use({ userAgent: IPHONE_SAFARI });

test('on an iPhone, Settings gives the Add to Home Screen steps and passes axe', async ({ page }) => {
  await page.goto('/#/map');
  await page.getByText('Settings', { exact: true }).click();
  await expect(page.getByText('Install on iPhone')).toBeVisible();
  await expect(page.getByText('Tap Add to Home Screen, then Add.')).toBeVisible();
  await axeClean(page, 'install help on an iPhone');
});
