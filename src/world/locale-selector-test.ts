import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import './locale-selector.ts'

describe('locale-selector component', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('locale-selector');
    document.body.appendChild(host);
  });

  it('renders a segmented-buttons child on connect', () => {
    const inner = host.querySelector('segmented-buttons');
    assert.ok(inner, 'segmented-buttons child should exist after connect');
  });

  it('renders "en" as a default language option', () => {
    // 'en' is a RiggedQueue winner and is always present in gLanguages
    const inner = host.querySelector('segmented-buttons') as HTMLElement;
    const enOption = inner.querySelector('[data-value="en"]');
    assert.ok(enOption, '"en" option should be rendered by default');
  });

  it('data-country sets data-value on inner segmented-buttons to first lang', () => {
    // teenyDb.langs('US') => ['en-US', 'es-US', 'haw', 'fr']
    host.setAttribute('data-country', 'US');
    const inner = host.querySelector('segmented-buttons') as HTMLElement;
    assert.strictEqual(inner.getAttribute('data-value'), 'en-US');
  });

  it('data-country adds the country languages as options', () => {
    // teenyDb.langs('DE') => ['de']
    host.setAttribute('data-country', 'DE');
    const inner = host.querySelector('segmented-buttons') as HTMLElement;
    const deOption = inner.querySelector('[data-value="de"]');
    assert.ok(deOption, '"de" option should appear after setting data-country="DE"');
  });

  it('data-country with empty string is a no-op', () => {
    const inner = host.querySelector('segmented-buttons') as HTMLElement;
    const valueBefore = inner.getAttribute('data-value');
    host.setAttribute('data-country', '');
    assert.strictEqual(inner.getAttribute('data-value'), valueBefore,
      'empty data-country should not change inner segmented-buttons data-value');
  });

  it('data-country with unknown country code does not set inner data-value', () => {
    // teenyDb.langs('XX') => [] — addCountryLocales returns undefined, observer returns early
    host.setAttribute('data-country', 'XX');
    const inner = host.querySelector('segmented-buttons') as HTMLElement;
    assert.strictEqual(inner.getAttribute('data-value'), null,
      'unknown country should not set data-value on inner segmented-buttons');
  });

  it('component rerenders options when a new country is added', () => {
    // teenyDb.langs('FR') => ['fr-FR', 'frp', 'br', 'co', 'ca', 'eu', 'oc']
    host.setAttribute('data-country', 'FR');
    const inner = host.querySelector('segmented-buttons') as HTMLElement;
    const frOption = inner.querySelector('[data-value="fr-FR"]');
    assert.ok(frOption, '"fr-FR" option should appear after setting data-country="FR"');
  });
});
