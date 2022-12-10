import { assert } from "chai";
import { GlobalWindow } from "happy-dom";
import { compileDoc, PageError } from "../../src/compiler/page-compiler";
import { HtmlDocument } from "../../src/preprocessor/htmldom";
import Preprocessor from "../../src/preprocessor/preprocessor";
import { normalizeSpace, normalizeText } from "../../src/preprocessor/util";
import { OUTER_PROPERTY, Page } from "../../src/runtime/page";

describe(`page samples`, () => {

  it(`hyphen attribute name`, async () => {
    const html = `<html data-dummy=[['']]></html>`;
    const loaded = await load('sample1.html', html);

    assert.exists(loaded.js);
    assert.equal(
      normalizeSpace(loaded.js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page', query: 'html',
        values: {
          attr_dataDummy: {
            fn: function () { return ''; },
            val: null
          }
        },
        children: [
          { id: '1', name: 'head', query: 'head' },
          { id: '2', name: 'body', query: 'body' }
        ]
      } }`)
    );

    assert.exists(loaded.page);
    loaded.page?.doc.head.remove();
    loaded.page?.doc.body.remove();
    assert.equal(
      clean(loaded.page?.getMarkup()),
      clean(`<html></html>`)
    );

    loaded.page?.refresh();
    assert.equal(
      clean(loaded.page?.getMarkup()),
      clean(`<html data-dummy=""></html>`)
    );
  });

  it(`dependent attribute value`, async () => {
    const html = `<html lang=[[v]] :v="en"></html>`;
    const page = (await load('sample1.html', html)).page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.doc.body.remove();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html></html>`)
    );

    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html lang="en"></html>`)
    );

    page.root.proxy['v'] = 'es';
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html lang="es"></html>`)
    );

    page.root.proxy['v'] = null;
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html></html>`)
    );
  });

  it(`function value 1`, async () => {
    const html = `<html lang=[[v()]] :v=[[() => 'en']]></html>`;
    const page = (await load('sample1.html', html)).page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.doc.body.remove();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html></html>`)
    );

    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html lang="en"></html>`)
    );
  });

  it(`function value 2`, async () => {
    const html = `<html lang=[[v()]] :v=[[() => x + y]] :x="e" :y="n"></html>`;
    const res = await load('sample1.html', html);
    assert.equal(res.errors?.length, 0);
    const page = res.page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.doc.body.remove();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html></html>`)
    );

    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html lang="en"></html>`)
    );
  });

  it(`function value 3`, async () => {
    const html = `<html lang=[[v()]] :v=[[function() { return x + y; }]] :x="e" :y="n"></html>`;
    const res = await load('sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.doc.body.remove();
    res.page?.refresh();
    assert.equal(
      clean(res.page?.getMarkup()),
      clean(`<html lang="en"></html>`)
    );
  });

  it(`function value 4`, async () => {
    const html = `<html :v=[[function() { return x + y; }]] :x="e" :y="n">
      <body lang=[[v()]]/>
    </html>`;
    const res = await load('sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    assert.equal(
      clean(res.page?.getMarkup()),
      clean(`<html>
        <body lang="en"></body>
      </html>`)
    );
  });

  it(`function value 5`, async () => {
    const html = `<html :f=[[function() { return v; }]] :v="in html">
      <body result=[[f()]] :v="in body"/>
    </html>`;
    const res = await load('sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    // `f` must behave as a method of `html`, so it must take `html`'s `v`
    // (and not `body`'s)
    assert.equal(
      clean(res.page?.getMarkup()),
      clean(`<html>
        <body result="in html"></body>
      </html>`)
    );
  });

  it(`function value 6`, async () => {
    const html = `<html :f=[[function(that) { return that.v; }]] :v="in html">
      <body result=[[f(this)]] :v="in body"/>
    </html>`;
    const res = await load('sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    assert.equal(
      clean(res.page?.getMarkup()),
      clean(`<html>
        <body result="in body"></body>
      </html>`)
    );
  });

  it(`function value 7`, async () => {
    const html = `<html :f=[[(that) => that.v]] :v="in html">
      <body result=[[f(this)]] :v="in body"/>
    </html>`;
    const res = await load('sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    assert.equal(
      clean(res.page?.getMarkup()),
      clean(`<html>
        <body result="in body"></body>
      </html>`)
    );
  });

  it(`event value`, async () => {
    const html = `<html>
      <body :on_click=[[function(ev) { v = ev.type }]] :v="">[[v]]</body>
    </html>`;
    const page = (await load('sample1.html', html)).page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
        <body><!---t0--><!---/--></body>
      </html>`)
    );

    page.doc.querySelector('body')?.click();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
        <body><!---t0-->click<!---/--></body>
      </html>`)
    );
  });

  it(`sample 1 - "Augmented HTML" from aremel.org`, async () => {
    const page = (await load('sample.html', `<html>
      <body :v=[[10]]>
        <button :on_click=[[function() { v--; }]]>-</button>
        [[v]]
        <button :on_click=[[function() { v++; }]]>+</button>
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        <button>-</button>
        <!---t0-->10<!---/-->
        <button>+</button>
      </body>
      </html>`)
    );
    page.doc.querySelector('button')?.click();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        <button>-</button>
        <!---t0-->9<!---/-->
        <button>+</button>
      </body>
      </html>`)
    );
  });

  it(`sample 2 - "Reusability" from aremel.org`, async () => {
    const page = (await load('sample.html', `<html>
      <body>
        <:define tag="app-product" :name :price>
          <b>Product: [[name]]</b>
          <div>Price: [[price]]</div>
          <p/>
        </:define>
    
        <app-product :name="Thingy" :price="1$"/>
        <app-product :name="Widget" :price="2$"/>
        <app-product :name="Gadget" :price="3$"/>
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        <div>
          <b>Product: <!---t0-->Thingy<!---/--></b>
          <div>Price: <!---t1-->1$<!---/--></div>
          <p></p>
        </div>
        <div>
          <b>Product: <!---t0-->Widget<!---/--></b>
          <div>Price: <!---t1-->2$<!---/--></div>
          <p></p>
        </div>
        <div>
          <b>Product: <!---t0-->Gadget<!---/--></b>
          <div>Price: <!---t1-->3$<!---/--></div>
          <p></p>
        </div>
      </body>
      </html>`)
    );
  });

  it(`sample 3/4 - "Reactivity/Isomorphism" from aremel.org`, async () => {
    const page = (await load('sample.html', `<html>
      <body :count=[[0]] data-test=[[false]]
            :handle_count=[[
              !count && setTimeout(() => count++, 0);
              attr_dataTest = true;
            ]]>
        Seconds: [[count]]
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body data-test="true">
        Seconds: <!---t0-->0<!---/-->
      </body>
      </html>`)
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body data-test="true">
        Seconds: <!---t0-->1<!---/-->
      </body>
      </html>`)
    );
  });

  it(`data binding 1 - data reference`, async () => {
    const page = (await load('sample.html', `<html>
      <body :data=[[{ id: 1, name: 'Alice' }]]>
        id: [[data.id]], name: [[data.name]]
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        id: <!---t0-->1<!---/-->, name: <!---t1-->Alice<!---/-->
      </body>
      </html>`)
    );
    page.root.proxy['body'].data = { id: 2, name: 'Bob' };
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        id: <!---t0-->2<!---/-->, name: <!---t1-->Bob<!---/-->
      </body>
      </html>`)
    );
  });

  it(`data binding 2 - data refinement`, async () => {
    const res = (await load('sample.html', `<html>
      <body :data=[[{ id: 1, name: 'Alice' }]]>
        <span :data=[[data.name]]>[[data]]</span>
      </body>
    </html>`));
    const js = res.js;
    assert.equal(normalizeSpace(js), normalizeSpace(`{
      root: {
        id: '0',
        name: 'page',
        query: 'html',
        children: [
          { id: '1', name: 'head', query: 'head' },
          { id: '2', name: 'body', query: 'body',
            values: {
              data: {
                fn: function () { return { id: 1, name: 'Alice' }; },
                val: null
              }
            },
            children: [{ id: '3', query: '[data-reflectjs="3"]',
              values: {
                __t0: {
                  fn: function () { return this.data; },
                  val: null,
                  refs: ['data']
                },
                data: {
                  fn: function () { return this.${OUTER_PROPERTY}.data.name; },
                  val: null,
                  refs: ['data']
                }
              }
            }]
          }
        ]
      }
    }`));
    const page = res.page as Page;
    page.refresh();
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        <span><!---t0-->Alice<!---/--></span>
      </body>
      </html>`)
    );
    page.root.proxy['body'].data = { id: 2, name: 'Bob' };
    assert.equal(
      clean(page.getMarkup()),
      clean(`<html>
      <head></head><body>
        <span><!---t0-->Bob<!---/--></span>
      </body>
      </html>`)
    );
  });

  // it(`data binding 3 - replication`, async () => {
  //   const page = (await load('sample.html', `<html>
  //     <body :data=[[{ list: [1, 2, 3] }]]>
  //       <ul>
  //         <li :data=[[data.list]]>[[data]]</li>
  //       </ul>
  //     </body>
  //   </html>`)).page as Page;
  //   page.refresh();
  //   assert.equal(
  //     clean(page.getMarkup()),
  //     clean(`<html>
  //     <head></head><body>
  //       <ul>
  //         <li><!---t0-->1<!---/--></li><li><!---t0-->2<!---/--></li><li><!---t0-->3<!---/--></li>
  //       </ul>
  //     </body>
  //     </html>`)
  //   );
  //   // page.root.proxy['body'].data = { id: 2, name: 'Bob' };
  //   // assert.equal(
  //   //   clean(page.getMarkup()),
  //   //   clean(`<html>
  //   //   <head></head><body>
  //   //     id: <!---t0-->2<!---/-->, name: <!---t1-->Bob<!---/-->
  //   //   </body>
  //   //   </html>`)
  //   // );
  // });

});

// =============================================================================
// util
// =============================================================================
const rootPath = process.cwd() + '/test/compiler/page-samples';

type Loaded = {
  pre: Preprocessor,
  doc?: HtmlDocument,
  js?: string,
  errors?: PageError[],
  page?: Page
};

async function load(fname: string, src?: string): Promise<Loaded> {
  const ret: Loaded = {
    pre: new Preprocessor(rootPath, (src ? [{
      fname: fname,
      content: src
    }] : undefined))
  };
  ret.doc = await ret.pre.read(fname);
  if (ret.doc) {
    const { js, errors } = compileDoc(ret.doc);
    ret.js = js;
    ret.errors = errors;
    if (errors.length == 0) {
      const props = eval(`(${js})`);
      const win = new GlobalWindow();
      win.document.write(ret.doc.toString());
      const root = win.document.documentElement as unknown as Element;
      ret.page = new Page(win, root, props);
    }
  }
  return ret;
}

function clean(s?: string) {
  if (s == null) {
    return undefined;
  }
  s = s.replace('<!DOCTYPE html>', '');
  s = s.replace(/(\s+data-reflectjs="\d+")/g, '');
  return normalizeText(s);
}