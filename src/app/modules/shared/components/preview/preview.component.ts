import { Component, ElementRef, HostBinding, Inject, Input, NgZone, OnInit, SecurityContext, SimpleChanges, ViewChild, } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { DayOfWeek } from '@unsonet/securepay-types';
import { ContentType, DisplayMethod, QuestionTypes, SelectionType, TaxType } from '@unsonet/securepay-types/promotions';
import { AirDatepickerDirective } from '@unsonet/ngx-air-datepicker-directive';
import { BootstrapSelectDirective } from '@unsonet/ngx-bootstrap-select-directive';
import { EmailValidators, PhoneValidators } from '@unsonet/ngx-validators';

import { toCamelCase, htmlToFragment, deepCompare, deepMerge, getDates, getEnumValues, getNestedValue, parseRegExpString, getRandomString, escapeHtml, splitFirst, stripHTML, templating, uniqueArr, waitForElement, toKebabCase, normalizeSpaces, insertElement } from '@unsonet/js-utils';
import { checkConditionGeneric } from '../../utils';
import moment from 'moment';
import { default as JsonForm } from "@rmanaf/json-form";
import { default as morphdom } from 'morphdom';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CSSParser, jscsspStyleRule } from '@unsonet/jscssp';


@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
  host: { '[class.position-relative]': 'positionRelative', '[class.d-block]': 'true', '[class.w-100]': 'true', '[class.h-100]': 'true' },
  standalone: false,
})
export class PreviewComponent implements OnInit {

  CSSParser;
  private jscsspStyleRule;
  private JsonForm;

  @Input() promotionData;
  @Input('previewTemplate') _previewTemplate;
  @HostBinding('class.position-relative') positionRelative: boolean = true;

  previewTemplate: string;
  morphing: boolean;
  saveInputStates: boolean;
  previewElement: Element;
  data: any;
  html: any;
  htmlChanges$: BehaviorSubject<any>;
  dataChanges$: BehaviorSubject<any> = new BehaviorSubject({});
  templatesHtml = this.getPreviewFormTemplates();
  previewOptionsHtml = this.getPreviewOptionsHtml();
  editors: Array<any> = [];
  errors: Array<any> = [];

  //previousPromotionData;
  previousPreviewAnswers: any;
  previewAnswersValidation: any;

  templatePending = false;
  templateUpdated = false;
  templateReady = false;
  datePattern = 'YYYY-MM-DD';
  //previewAccept = false;

  jsonForm;
  @ViewChild("preview", { static: false }) preview: ElementRef;

  private isUpdating = false;

  public get currencyFormat(): string {
    return this.promotionData?.hotel?.currencyFormat || "#,####,##0.00"
  }

  public get currency(): string {
    return this.promotionData?.hotel?.currency || "USD"
  }

  constructor(
    @Inject('format') public format: any,
    //@Inject('CSSParser') public CSSParser: any,
    //@Inject('jscsspStyleRule') private jscsspStyleRule: any,
    //@Inject('JsonForm') private JsonForm: any,
    @Inject('rrule') private rrule: any,
    private domSanitizer: DomSanitizer,
  ) {
    this.JsonForm = JsonForm;
    this.CSSParser = new CSSParser('');
    this.jscsspStyleRule = jscsspStyleRule;

    this.previewElement = document.querySelector('#promotionDisplay');
  }

  ngOnInit() {
    this.jsonForm = {
      create: (typeof this.JsonForm?.create === 'function' ? this.JsonForm?.create : (d, o, t) => new this.JsonForm(d, o, t)),
      Engine: this.JsonForm?.Engine ? this.JsonForm?.Engine : this.JsonForm
    };
    Object.assign(this.JsonForm, this.JsonForm?.prototype || {});

    this.templateReady = false;
    //this.previousPromotionData = this.promotionData;
    this.setCustomJS();
    this.setCustomCSS();
    this.dataChanges$.pipe(debounceTime(10)).subscribe(async (changes) => {
      if (Object.keys(changes).includes('promotionData')) {
        this.templatePending = true;
        //this['previousPromotionData'] = changes['promotionData'].previousValue;
        this['promotionData'] = PreviewComponent.getDefaultPromotionData(changes['promotionData'].currentValue);
      }

      try {
        this.updatePreviewOptionsHtml();
        this.templateUpdated = false;
        this.updatePreview();
      } catch (error) {
        //console.log('ERROR',error)
      }
    });
    this.htmlChanges$ = new BehaviorSubject(this.html);
    this.htmlChanges$.pipe(debounceTime(10)).subscribe(async (model) => {
      if (!this.preview.nativeElement.dataset.instanceHash) {
        this.preview.nativeElement.dataset.instanceHash = getRandomString(32);
      }
      this.setCustomCSS();
      this.templateUpdated = !!(await this.afterHtmlChange());
      if (this.templateUpdated) {
        this.templatePending = false;
        let templateUpdatedEvent = new Event("template-updated", { bubbles: true });
        this.preview.nativeElement.dispatchEvent(templateUpdatedEvent);
      }
    });
  }

  ngAfterViewInit() {
    this.preview.nativeElement.dataset.renderHash = getRandomString(32);

    this.preview.nativeElement.addEventListener('click', disabledClick, true);
    let _this = this;
    function disabledClick(event: any) {
      if (!(_this.templateUpdated && _this.templateReady)) {
        event.preventDefault();
      } else {
        _this.preview.nativeElement.removeEventListener('click', disabledClick);
      }
    }

    this.previewElement.addEventListener('template-submit', (e) => { console.log(e) });
  }

  public updateData(data?) {
    this.ngOnChanges({
      promotionData: {
        currentValue: data ?? this.promotionData
      }
    })
  }

  async ngOnChanges(changes: any) {
    this.dataChanges$.next(changes);
  }

  async afterHtmlChange() {
    try {
      let res = await this.setJsonForm();
      if (res == false) {
        throw new Error();
      }

      let prev = await this.previewHandling();

      if (prev == false) {
        this.templateUpdated = false;
        throw new Error();
      }

      this.errors = [];
      //resolve(true);
      return true;
    } catch (error) {
      this.templateUpdated = false;

      this.errors.push(error);
      if (this.errors.length < 10) {
        this.templatePending = true;
        this.updatePreview();
      }
      return false;
    }

  }

  public updatePreview() {
    if (this.isUpdating) return;

    this.isUpdating = true;

    try {
      this.data = Object.assign({}, this.promotionData, this.getDefaultData());

      if (this.previewTemplate) {
        requestAnimationFrame(() => {

          let saveInputStates = this.saveInputStates;
          let morphing = this.morphing;
          let triggerChanges = () => {
            var modelEditorElement = (this.preview?.nativeElement?.querySelector("#previewOptionsForm") as HTMLElement);
            if (this.htmlChanges$ && modelEditorElement) {
              this.htmlChanges$.next(this.html);
            }
          };

          let handleHtmlElements = (fromEl: Element, toEl: Element) => {

            const isInPromotionOptions = (el: Element | null): boolean =>
              !!el?.closest?.('.promotion-options');

            if (isInPromotionOptions(fromEl) || isInPromotionOptions(toEl)) {
              return true;
            }
            let getTag = () => (fromEl.tagName === toEl.tagName) && fromEl.tagName;


            switch (getTag()) {
              case 'IMG': {
                const fromImg = fromEl as HTMLImageElement;
                const toImg = toEl as HTMLImageElement;

                if (fromImg.src === toImg.getAttribute('data-src')) {
                  return false;
                }
                break;
              }
              case 'VIDEO': {
                const fromSrc = fromEl.querySelector('source')?.getAttribute('src');
                const toSrc = toEl.querySelector('source')?.getAttribute('src');
                if (fromSrc && toSrc && fromSrc === toSrc) {
                  return false;
                }
                break;
              }
              case 'INPUT': {
                const from = fromEl as HTMLInputElement;
                const to = toEl as HTMLInputElement;

                if (!saveInputStates) return true;
                if (from.type === 'file') return true;

                const state = {
                  value: from.value,
                  checked: from.checked,
                  selectionStart: from.selectionStart,
                  selectionEnd: from.selectionEnd
                };

                if (from.type === 'checkbox' || from.type === 'radio') {
                  to.checked = state.checked;
                } else {
                  to.value = state.value;

                  // cursor position shift (if the element is in focus)
                  if (document.activeElement === from) {
                    try {
                      if (state.selectionStart !== null) {
                        to.selectionStart = state.selectionStart;
                        to.selectionEnd = state.selectionEnd;
                        to.focus();
                      }

                    } catch { }
                  }
                }

                return true;
                break;
              }
              case 'TEXTAREA': {
                const from = fromEl as HTMLTextAreaElement;
                const to = toEl as HTMLTextAreaElement;

                if (!saveInputStates) return true;

                const state = {
                  value: from.value,
                  selectionStart: from.selectionStart,
                  selectionEnd: from.selectionEnd
                };

                to.value = state.value;

                try {
                  if (state.selectionStart !== null) {
                    to.selectionStart = state.selectionStart;
                    to.selectionEnd = state.selectionEnd;
                  }
                } catch { }

                return true;
                break;
              }
              case 'SELECT': {
                const from = fromEl as HTMLSelectElement;
                const to = toEl as HTMLSelectElement;

                if (!saveInputStates) return true;

                if (from.multiple) {
                  const selected = Array.from(from.selectedOptions).map(o => o.value);
                  Array.from(to.options).forEach(o => {
                    o.selected = selected.includes(o.value);
                  });
                } else {
                  to.value = from.value;
                }

                return true;
                break;
              }
              case 'DETAILS': {
                if (!saveInputStates) return true;
                (toEl as HTMLDetailsElement).open =
                  (fromEl as HTMLDetailsElement).open;
                return true;
                break;
              }
              case 'PROGRESS': {
                if (!saveInputStates) return true;
                (toEl as any).value = (fromEl as any).value;
                return true;
                break;
              }
              case 'METER': {
                if (!saveInputStates) return true;
                (toEl as any).value = (fromEl as any).value;
                return true;
                break;
              }
              default: {

                // CONTENTEDITABLE
                if (
                  fromEl instanceof HTMLElement &&
                  toEl instanceof HTMLElement &&
                  fromEl.isContentEditable &&
                  toEl.isContentEditable
                ) {
                  if (!saveInputStates) return true;
                  toEl.innerHTML = fromEl.innerHTML;
                  return true;
                }

                break;
              }

            }

            return true;
          };

          if (this.preview.nativeElement && this.templatePending) {
            const html = this.replacePatterns(
              this.previewTemplate,
              this.data,
              [undefined, ''],
              false
            );
            const highlighted = this.setHighlight(html);
            this.html = highlighted;

            //let container: any = document.createElement('div');
            //container.innerHTML = html;
            let container: any = this.parseHTMLWithoutLoadingImages(html).firstChild;

            if (!morphing) {
              const fragment = document.createDocumentFragment();
              while (container.firstChild) {
                fragment.appendChild(container.firstChild);
              }
              container = fragment;
            }

            insertElement({
              subject:container,
              content: (`<div id="templates-fragment">` + this.templatesHtml + '</div>'),
              elementUniqueSelector: '#templates-fragment',
              operation:'before'
            });

            if (morphing) {
              morphdom(this.preview.nativeElement, container, {
                childrenOnly: true,

                onBeforeElUpdated: (fromEl, toEl) => {
                  let hasChanges = handleHtmlElements(fromEl, toEl);
                  if (hasChanges) {
                    triggerChanges();
                    return true;
                  } else {
                    return false;
                  }
                }
              });
            } else {
              this.preview.nativeElement.innerHTML = '';
              this.preview.nativeElement.appendChild(container);
            }
          }

          if (!morphing) {
            triggerChanges();
          }
        });
      }
    } finally {
      this.isUpdating = false;
    }
  }

  private parseHTMLWithoutLoadingImages(html: string): DocumentFragment {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const fragment = document.createDocumentFragment();

    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_ELEMENT,
      null,
    );

    const nodes: Element[] = [];
    let node;
    while (node = walker.nextNode() as Element) {
      nodes.push(node);
    }

    nodes.reverse().forEach(element => {
      if (element.tagName === 'IMG') {
        const src = element.getAttribute('src');
        if (src) {
          element.setAttribute('data-src', src);
          element.removeAttribute('src');
        }
      }

      if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
        const poster = element.getAttribute('poster');
        if (poster) {
          element.setAttribute('data-poster', poster);
          element.removeAttribute('poster');
        }

        Array.from(element.querySelectorAll('source')).forEach(source => {
          const src = source.getAttribute('src');
          if (src) {
            source.setAttribute('data-src', src);
            source.removeAttribute('src');
          }
        });
      }
    });

    while (doc.body.firstChild) {
      fragment.appendChild(doc.body.firstChild);
    }

    return fragment;
  }

  getDefaultData() {
    return {
      amount: this.format(this.currencyFormat, (this.getPreviewAnswers(Object.assign({}, window['previewAnswers'])) as any)?.totalCost || 0),
      previewOptions: this.previewOptionsHtml + this.replacePatterns(this.getPreviewTaxesHtml(), { taxesTitle: window['previewAnswers']?.taxes?.reduce((prev, cur) => prev + cur?.cost || 0, 0) || 0 ? 'Taxes:' : '' }),
    }
  }

  getPreviewOptionsHtml() {
    return `<div id="previewOptionsForm" class="model-editor promotion-options" data-model-editor></div>`;
  }

  getPreviewTaxesHtml() {
    return `<table id="previewTaxes" class="model-editor promotion-taxes" data-model-editor><thead><tr><th><b>[-taxesTitle-]</b></th></tr><thead><tbody></tbody></table>`;
  }

  setHighlight(innerHtml) {
    let templatingOptions = {
      startSymbols: '[-',
      endSymbols: '-]',
      text: innerHtml,
      insideTags: false,
      callbackFn: (word) => `<span class="highlight">${word}</span>`
    };

    return templating(templatingOptions);
  }

  replacePatterns(innerHtml, data, emptyValues?, showEmptyPattern?) {
    showEmptyPattern = showEmptyPattern != undefined ? showEmptyPattern : true;
    emptyValues = emptyValues || [undefined];//''
    let templatingOptions = {
      startSymbols: '[-',
      endSymbols: '-]',
      text: innerHtml,
      insideTags: true,
      callbackFn: (word) => {
        let key = splitFirst(word.replace('[-', '').replace('-]', ''), /\|/).map((item, i) => {
          if (i == 1) {
            return item;
          } else {
            return item.trim();
          }
        });
        return !emptyValues.includes(getNestedValue(data, key[0])) ? getNestedValue(data, key[0]) : key.length > 1 ? emptyValues.includes(key[1]) ? '' : key[1] : showEmptyPattern ? word : '';
      }
    };
    let value = templating(templatingOptions).trim();
    return value;
  }

  async previewHandling() {
    //!need to review

    try {

      if (this.editors?.length) {
        //console.log('previewHandling', (deepCompare as any)(this.previousPreviewAnswers, window['previewAnswers']), this.preview, this.templateUpdated);
        if ((deepCompare as any)(this.previousPreviewAnswers, window['previewAnswers']) && this.preview) {
          if (!this.templateUpdated) {

            let setEventHandler = (element, eventName, handlerFn) => {
              element.eventHandlers = element.eventHandlers || {};
              if (element.eventHandlers[eventName]) {
                element.removeEventListener(eventName, element.eventHandlers[eventName]);
                delete element.eventHandlers[eventName];
              }

              element.addEventListener(eventName, handlerFn);
              element.eventHandlers[eventName] = handlerFn;
            };

            this.previousPreviewAnswers = window['previewAnswers'];

            let previewNodes = this.editors.map((category, categoryIndex) => {
              let prewiewCategory = category.editor._nodes.filter(item => item.localName == 'table')[0];
              return {
                category: prewiewCategory,
                questions: category.questions.map((question, questionIndex) => {
                  let prewiewQuestion = question.editor._nodes.filter(item => item.localName == 'tr')?.[0]?.querySelector('.question') || null;
                  return {
                    question: prewiewQuestion
                  }
                })
              }
            });

            previewNodes.forEach((previewCategory, categoryIndex) => {
              previewCategory.questions.forEach((previewQuestion, questionIndex) => {
                let prewiewQuestion = previewQuestion.question;
                let category = this.promotionData.categories[categoryIndex];
                let question = category.questions[questionIndex];
                let questionType = Object.keys(question)[0];
                let questionData = question[questionType];

                let datepicker = prewiewQuestion?.querySelector('.dateInput');
                if (datepicker) {
                  let datepickerInstance = datepicker.datepickerInstance;//$(datepicker).data('datepicker');
                  let removeDate = (datepickerInstance?.removeDate || datepickerInstance?.unselectDate).bind(datepickerInstance);
                  let removeLinks = [...prewiewQuestion.querySelectorAll('a.remove')];
                  let clearButton = prewiewQuestion.querySelector('button.clear-dates');

                  removeLinks.forEach((removeLink, index) => {
                    let removeLinkClickHandler = (event) => {
                      let datesArray = datepickerInstance.selectedDates;//.sort((a, b) => a - b);
                      let trElement = event.target.closest('tr');
                      if (trElement) {
                        trElement.remove();
                      }
                      if (questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple) {
                        [...datesArray].forEach(date => {
                          removeDate(date);
                        });
                      } else {
                        removeDate(datesArray[index]);
                      }
                    };

                    setEventHandler(removeLink, 'click', removeLinkClickHandler);

                  });

                  let clearButtonClickHandler = (event) => {
                    let datesArray = datepickerInstance.selectedDates;
                    let trElement = event.target.closest('tr');
                    if (trElement.children[1]) {
                      trElement.children[1].remove();
                    }
                    [...datesArray].forEach(date => {
                      removeDate(date);
                    });
                  };

                  setEventHandler(clearButton, 'click', clearButtonClickHandler);

                }
              });
            })

            //////////////////////
            this.previewAnswersValidation = this.getPreviewAnswersValidation();

            let promotionDetail = window['promotionDetail'] = {
              promotion: PreviewComponent.getFormattedPromotionData(this.promotionData),
              validation: this.previewAnswersValidation,
              answers: PreviewComponent.getFormattedPreviewAnswers(PreviewComponent.getFormattedPromotionData(this.promotionData), window['previewAnswers'])
            }

            // let accept = this.preview.nativeElement.querySelector('[name="acceptT&C"]');
            // accept.checked = this.previewAccept;
            // accept.addEventListener('change', async (event) => {
            //   this.previewAccept = event.target.checked;
            //   console.log("accept", this.previewAccept);
            //   try {
            //     this.updatePreviewOptionsHtml();
            //     await this.updatePreview();
            //   } catch (error) {
            //     //console.log('ERROR',error)
            //   }
            // });

            let payPreAuthButtons = [...this.preview?.nativeElement?.querySelectorAll(".payPreAuthButton")];
            // if (this.previewAnswersValidation.valid && this.previewAccept) {
            //   payPreAuthButtons.forEach(item=>item.classList.remove('disabled'));
            // } else {
            //   payPreAuthButtons.forEach(item=>item.classList.add('disabled'));
            // }

            payPreAuthButtons.forEach(item => {

              let payPreAuthButtonClickHandler = async (event) => {
                event.preventDefault();
                let input = event.target;
                let valid = this.previewAnswersValidation.valid && !input.classList.contains('disabled');
                if (valid) {
                } else {
                  this.validationTouchAll();
                  console.log('CLICK');
                  try {
                    this.updatePreviewOptionsHtml();
                    this.updatePreview();
                  } catch (error) {
                    //console.log('ERROR',error)
                  }
                }
                let templateSubmitEvent = new CustomEvent("template-submit", {
                  bubbles: true,
                  detail: promotionDetail
                }) as Event;
                this.preview.nativeElement?.dispatchEvent(templateSubmitEvent);
              };

              setEventHandler(item, 'click', payPreAuthButtonClickHandler);
            });

            if (this.templateReady == false) {
              let templateReadyEvent = new Event("template-ready", { bubbles: true });
              this.preview.nativeElement?.dispatchEvent(templateReadyEvent);
              this.templateReady = true;
            }

          }
          console.log('promotionData2', window['previewAnswers'], this.previewAnswersValidation.valid);
          return true;
        } else {
          this.previousPreviewAnswers = window['previewAnswers'];
          //await this.updatePreview();//*to update total
          return false;
        }

      }

      return false;

    } catch (error) {
      console.log('previewHandlingError', error);
      return false;
    }

  }

  static getDefaultPromotionData(promotionData, withInterface?) {

    var defaults = {
      "name": "",
      // "hotel": {
      //   "id": 262,
      //   "name": "SOFITEL Dubai Jumeirah Beach",
      //   "currency": "AED",
      //   "currencyFormat": "#,####,##0.00"
      // },
      // "department": {
      //   "id": initialisationData.bccDepartments[0]["id"],
      //   "name": initialisationData.bccDepartments[0]["name"]
      // },
      // "displayTemplate": Object.filter({
      //   "id": initialisationData.templateDepartments[0]["id"],
      //   "name": initialisationData.templateDepartments[0]["name"],
      //   "description": initialisationData["templates"].filter(item=>item.id == (initialisationData.templateDepartments.filter(item=>item.id == initialisationData.bccDepartments[0]["id"])[0]["id"]) )[0]?.["description"] || ""
      // }, (item) => item),
      // "taxes":[{
      //   [promotionData?.taxes?.id ? 'id' : 'tempId']: promotionData?.taxes?.id ? promotionData?.taxes?.id : promotionData?.taxes?.tempId || getRandomString(32),
      //   tax: {
      //     [promotionData?.taxes?.tax?.id ? 'id' : 'tempId']: promotionData?.taxes?.tax?.id ? promotionData?.taxes?.tax?.id : promotionData?.taxes?.tax?.tempId || getRandomString(32),
      //     name: promotionData?.taxes?.tax?.name || '',
      //     taxType: promotionData?.taxes?.tax?.taxType || TaxType[0]
      //   },
      //   amount: promotionData?.taxes?.amount != undefined ? promotionData?.taxes.amount : 0
      // }],
      "promotionText": "",
      "contactName": "",
      "contactEmail": "",
      "contactPhone": "",
      "footerText": "",
      //"notifyEmails": initialisationData.bccDepartments[0].users?.map(item=>item["emailAddress"]) || [],
      "customCSS": "",
      "customJS": "",
      "enabled": true
    };

    if (promotionData?.taxes?.length) {
      defaults["taxes"] = promotionData?.taxes.map(item => {
        return {
          [item?.id ? 'id' : 'tempId']: item?.id ? item?.id : item?.tempId || getRandomString(32),
          tax: {
            [item?.tax?.id ? 'id' : 'tempId']: item?.tax?.id ? item?.tax?.id : item?.tax?.tempId || getRandomString(32),
            name: item?.tax?.name || '',
            taxType: item?.tax?.taxType || TaxType[0]
          },
          amount: item?.amount != undefined ? item.amount : 0
        };
      })
    }

    if (withInterface) {

      let promotionInterface = ((data: any) => {
        return {
          hasTaxes: data?.taxes?.length ? true : false,
          promotionDate: data?.promotionDates?.staticDates ? 'specific' : data?.promotionDates?.recurringDates ? 'recurring' : 'noDate',
          endRecurrence: data?.promotionDates?.recurringDates ? data?.promotionDates?.recurringDates?.lastDate ? 'limited' : 'unlimited' : 'limited',
          maxAttendees: data?.maxAttendeesPerDate ? 'limited' : 'unlimited',
          publish: data?.activeDateRange ? 'range' : 'always',
        };
      })(promotionData);

      defaults = Object.assign({}, defaults, promotionInterface);
    }

    defaults["categories"] = promotionData?.categories ? promotionData.categories.map(category => {

      let categoryData;

      categoryData = {
        "description": "",
        "name": "",
        "showHeadings": true,
        "questions": category.questions.map(question => {

          let interfaceObj: any = withInterface ? ((data) => ({
            //interface
            basePrice: uniqueArr(Object.keys(data?.basePrices || []).map(key => data?.basePrices[key])).length == 1 ? 'standardPricing' : 'perDayPricing',
            addTaxes: data?.taxes?.length ? true : false,
            dates: (() => {
              let dateList = Object.keys(data?.possibleDates?.['staticDatesWithPricing']?.['dates'] || []);
              return promotionData.promotionDate == "specific" || dateList.every(item => (promotionData.promotionDates?.staticDates?.dates || []).includes(item)) || !dateList.length ? 'same' : 'specific'
            })(),
            selectMultipleOptions: data?.selectMultiple ? true : false,
            buyMultipleOptions: data?.buyMultiple ? true : false,
            pricing: data?.pricingDependencyMethod ? data?.pricingDependencyMethod == 'perQuantity' ? 'perQuantity' : ['perDay', 'perNight'].includes(data?.pricingDependencyMethod) ? 'perDate' : 'asIs' : 'asIs',
            display: data?.sameValueAs ? 'never' : data.displayCriteria ? 'conditional' : 'always',
          }))(question[Object.keys(question)[0]]) : {};

          let questionData;

          if (question["multiChoiceQuestion"]) {
            questionData = {
              "multiChoiceQuestion": {
                ...interfaceObj,
                "selectMultiple": false,
                "buyMultiple": false,
                "showHeadings": true,
                "mandatory": false,
                "displayMethod": "expandedList",
                "optionCostsFixed": true
              }
            };
          } else if (question["dateQuestion"]) {
            questionData = {
              "dateQuestion": {
                ...interfaceObj,
                "selectMultiple": false,
                "buyMultiple": false,
                "showHeadings": true,
                "mandatory": false,
                "basePrices": {
                  "sunday": 0,
                  "monday": 0,
                  "tuesday": 0,
                  "wednesday": 0,
                  "thursday": 0,
                  "friday": 0,
                  "saturday": 0
                },
                "pricingMethod": "perDay",
              }
            };
          } else if (question["shortTextQuestion"]) {
            questionData = {
              "shortTextQuestion": {
                ...interfaceObj,
                "showHeadings": true,
                "mandatory": false,
                "contentType": "text"
              }
            };
          } else if (question["longTextQuestion"]) {
            questionData = {
              "longTextQuestion": {
                ...interfaceObj,
                "showHeadings": true,
                "mandatory": false,
              }
            };
          }

          return questionData;

        })
      }

      return categoryData;

    }) : [];

    return deepMerge(defaults, promotionData, { mutation: false });

  }

  static getFormattedPromotionData(promotionData) {
    let data = {};
    Object.keys(promotionData).forEach(key => {
      switch (key) {
        case 'tempId': {
          data[key] = promotionData[key];
          break;
        } case 'id': {
          data[key] = promotionData[key];
          break;
        }
        case 'name': {
          data[key] = promotionData[key];
          break;
        }
        case 'hotel': {
          data[key] = promotionData[key];
          break;
        }
        case 'department': {
          data[key] = promotionData[key];
          break;
        }
        case 'displayTemplate': {
          data[key] = promotionData[key];
          break;
        }
        case 'taxes': {
          if (promotionData.hasTaxes) {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'promotionDates': {
          if (promotionData.promotionDate != 'noDate') {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'maxAttendeesPerDate': {
          if (promotionData.maxAttendees == 'limited') {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'promotionText': {
          data[key] = promotionData[key];
          break;
        }
        case 'contactName': {
          data[key] = promotionData[key];
          break;
        }
        case 'contactEmail': {
          data[key] = promotionData[key];
          break;
        }
        case 'contactPhone': {
          data[key] = promotionData[key];
          break;
        }
        case 'notifyEmails': {
          data[key] = promotionData[key];
          break;
        }
        case 'additionalBccEmails': {
          //!pay attention
          break;
        }
        case 'footerText': {
          data[key] = promotionData[key];
          break;
        }
        case 'activeDateRange': {
          if (promotionData.publish == 'range') {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'customCSS': {
          if (promotionData[key]) {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'customJS': {
          if (promotionData[key]) {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'blockedDates': {
          if (promotionData[key]) {
            data[key] = promotionData[key];
          }
          break;
        }
        case 'categories': {

          data[key] = promotionData[key].map(category => {
            let categoryData = {};
            Object.keys(category).forEach(categoryKey => {
              switch (categoryKey) {
                case 'tempId': {
                  categoryData[categoryKey] = category[categoryKey];
                  break;
                } case 'id': {
                  categoryData[categoryKey] = category[categoryKey];
                  break;
                } case 'name': {
                  categoryData[categoryKey] = category[categoryKey];
                  break;
                } case 'description': {
                  categoryData[categoryKey] = category[categoryKey];
                  break;
                } case 'showHeadings': {
                  categoryData[categoryKey] = category[categoryKey];
                  break;
                } case 'questions': {
                  categoryData[categoryKey] = category[categoryKey].map(question => {
                    let questionTypeData = {};
                    let questionType = Object.keys(question)[0];
                    let questionData = question[questionType];
                    questionTypeData[questionType] = (() => {
                      let questionObj = {};
                      Object.keys(questionData).forEach(questionKey => {
                        switch (questionKey) {
                          case 'tempId': {
                            questionObj[questionKey] = questionData[questionKey];
                            break;
                          }
                          case 'id': {
                            questionObj[questionKey] = questionData[questionKey];
                            break;
                          }
                          case 'title': {
                            questionObj[questionKey] = questionData[questionKey];
                            break;
                          }
                          case 'description': {
                            questionObj[questionKey] = questionData[questionKey];
                            break;
                          }
                          case 'showHeadings': {
                            questionObj[questionKey] = questionData[questionKey];
                            break;
                          }
                          case 'mandatory': {
                            questionObj[questionKey] = questionData[questionKey];
                            break;
                          }
                          case 'options': {
                            if (questionType == QuestionTypes[0]) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'displayMethod': {
                            if (questionType == QuestionTypes[0]) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'taxes': {
                            if ([QuestionTypes[0], QuestionTypes[1]].includes(questionType) && questionData.addTaxes) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'pricingDependsOn': {
                            if (questionType == QuestionTypes[0] && questionData.pricing != 'asIs') {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'pricingDependencyMethod': {
                            if (questionType == QuestionTypes[0] && questionData.pricing == 'perDate') {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'sameValueAs': {
                            if (questionType == QuestionTypes[1] && questionData.display == 'never') {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'possibleDates': {
                            let dateList = Object.keys(questionData[questionKey]?.['staticDatesWithPricing']?.['dates'] || []);
                            let isSameAsPromotion = dateList.every(item => (promotionData?.promotionDates?.staticDates?.dates || []).includes(item));

                            if ((questionType == QuestionTypes[1] && isSameAsPromotion)) {

                            } else {
                              if (questionType == QuestionTypes[1]) {
                                questionObj[questionKey] = questionData[questionKey];
                              }
                            }

                            break;
                          }
                          case 'basePrices': {
                            if (questionType == QuestionTypes[1]) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'pricingMethod': {
                            if (questionType == QuestionTypes[1]) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'selectMultiple': {
                            if ([QuestionTypes[0], QuestionTypes[1]].includes(questionType) && questionData.selectMultiple) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'selectMultipleType': {
                            if (questionType == QuestionTypes[1]) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'buyMultiple': {
                            if ([QuestionTypes[0], QuestionTypes[1]].includes(questionType) && questionData.buyMultiple) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'contentType': {
                            if ([QuestionTypes[2]].includes(questionType)) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'validationRegex': {
                            if ([QuestionTypes[2]].includes(questionType) && questionData[questionKey]) {
                              questionObj[questionKey] = questionData[questionKey] || null;
                            }
                            break;
                          }
                          case 'defaultValue': {
                            if ([QuestionTypes[2]].includes(questionType) && questionData[questionKey]) {
                              questionObj[questionKey] = questionData[questionKey] || null;
                            }
                            break;
                          }
                          case 'valueLimits': {
                            if ([QuestionTypes[2]].includes(questionType) && questionData.contentType == ContentType[3]) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'optionCostsFixed': {
                            if ([QuestionTypes[0]].includes(questionType) && questionData.pricing != 'perDate') {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'displayCriteria': {
                            if (questionData.display != 'always') {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'attendeeCountIncrement': {
                            if ([QuestionTypes[0], QuestionTypes[1]].includes(questionType)) {
                              questionObj[questionKey] = questionData[questionKey];
                            }
                            break;
                          }
                          case 'tags': {
                            if ([QuestionTypes[0], QuestionTypes[1]].includes(questionType)) {
                              let tags = {};
                              let keys = Object.keys(questionData[questionKey]);
                              let mandatoryKeys = [];//old:'attendeeCountIncrement'

                              mandatoryKeys.forEach(key => {
                                if (!keys.includes(key)) {
                                  keys.push(key);
                                }
                              })

                              keys.forEach(key => {
                                if (key == 'addsToAttendeeCount') {
                                  if (questionData[questionKey][key]) {
                                    tags[key] = questionData[questionKey][key];
                                  }
                                }
                                // else if (key == 'attendeeCountIncrement') {
                                //   tags[key] = questionData[questionKey]['addsToAttendeeCount'] ? questionData[questionKey][key] : 0;
                                // } 
                                else if (key == 'isAttendanceDate') {
                                  if ([QuestionTypes[1]].includes(questionType) && questionData[questionKey][key]) {
                                    tags[key] = questionData[questionKey][key];
                                  }
                                }
                              });
                              if (keys.length) {
                                questionObj[questionKey] = tags;
                              }
                            }

                            break;
                          }
                          default: {
                            break;
                          }

                        }
                      })

                      return questionObj;

                    })();

                    return questionTypeData;

                  });
                  break;
                }
                default: {

                  break;
                }

              }
            });
            return categoryData
          });
          break;
        }
        case 'uuid': {
          data[key] = promotionData[key];
          break;
        }
        case 'promotionLink': {
          data[key] = promotionData[key];
          break;
        }
        case 'enabled': {
          data[key] = promotionData[key];
          break;
        }
        case 'createdBy': {
          data[key] = promotionData[key];
          break;
        }
        default: {
          //data[key] = promotionData[key];
          break;
        }
      }
    });

    return data;
  }

  static getFormattedPreviewAnswers(promotionData, previewAnswers) {
    let data = {};

    Object.keys(previewAnswers).forEach(key => {
      switch (key) {
        case 'categories': {
          data[key] = previewAnswers[key].map((category, categoryIndex) => {
            let categoriesData = {};
            Object.keys(category).forEach(categoryKey => {
              if (categoryKey == 'questions') {
                categoriesData[categoryKey] = category[categoryKey].map((question, questionIndex) => {
                  let questionData = {};
                  Object.keys(question).forEach(questionKey => {
                    if (questionKey == 'options') {
                      questionData[questionKey] = question[questionKey].filter(item => item.selected);
                    } else {
                      questionData[questionKey] = question[questionKey];
                    }
                  });
                  return questionData;
                }).filter((question, index) => {
                  return (this.prototype.displayPreviewQuestion.call({ promotionData, getRequiredPreviewData: this.prototype.getRequiredPreviewData, checkConditionGeneric: checkConditionGeneric }, categoryIndex, index, previewAnswers) == true) &&
                    (() => {
                      let keys = Object.keys(question);
                      if (keys.includes('options')) {
                        return !!question.options.length
                      } else if (keys.includes('dates')) {
                        return !!question?.dates?.length
                      } else {
                        return true
                      }
                    })();
                });
              } else {
                categoriesData[categoryKey] = category[categoryKey]
              }
            });

            return categoriesData;

          }).filter((category, categoryIndex) => category?.questions?.length);

          break;
        }
        default: {
          data[key] = previewAnswers[key];
          break;
        }
      }
    });

    return data;
  }

  async setCustomCSS() {
    await waitForElement(`#promotion`);
    var preview = this.preview?.nativeElement;

    var textCSS = "";
    var div = document.createElement('div');
    var style = document.head.querySelector('style.custom-css');//preview.parentElement.querySelector('style.custom-css');
    div.innerHTML = this.promotionData.customCSS;
    let divCSSText = normalizeSpaces((div as any)?.textContent || '');
    let styleCSSText = normalizeSpaces((style as any)?.textContent || '');

    if (!preview || divCSSText == styleCSSText) return;

    if (divCSSText) {
      var sheet = this.CSSParser.parse(div.textContent, false, true);

      let hashes = [
        'instanceHash',
        //'renderHash'
      ];
      let hashesAttributesStr = hashes.map(hashName => {
        return `[data-${toKebabCase(hashName)}='${preview.dataset[hashName]}'] `
      });

      textCSS = sheet ? normalizeSpaces(sheet.cssRules.filter(item => this.jscsspStyleRule.prototype.isPrototypeOf(item)).reduce((start, item) => {
        return start += hashesAttributesStr + item.cssText() + '\n';
      }, '') || '') : '';

      if (!style) {
        style = document.createElement('style');
        style.className = "custom-css";

        document.head.appendChild(style);//preview.parentElement.appendChild(style);
      }
      if (textCSS != styleCSSText) {
        style.textContent = textCSS;
      }

    } else {
      if (style) style.remove();
      //style.textContent = '';
    }

  }

  async setCustomJS() {
    var preview = this.preview?.nativeElement;
    var textJS = "";
    var div = document.createElement('div');
    var script = document.head.querySelector('script.custom-js');//preview.parentElement.querySelector('style.custom-css');
    div.innerHTML = this.promotionData.customJS;

    if ((div as any)?.textContent?.trim() == (script as any)?.textContent?.trim()) return;

    if ((div as any)?.textContent?.trim()) {

      textJS = (div as any)?.textContent?.trim()

      if (!script) {
        script = document.createElement('script');
        script.className = "custom-js";

        document.head.appendChild(script);//preview.parentElement.appendChild(style);
      }
      if (textJS != script.textContent) {
        script.textContent = textJS;
      }

    } else {
      if (script) script.remove();
      //style.textContent = '';
    }
  }

  async setJsonForm() {
    //return new Promise(async (resolve, reject) => {
    //setTimeout(async () => {
    try {
      let modelEditorElement = (this.preview?.nativeElement?.querySelector("#previewOptionsForm") as HTMLElement);

      //if (!modelEditorElement) return;
      this.editors = [];
      if (this.templatePending) {
        window['previewAnswers'] = this.getPreviewAnswers(this.previousPreviewAnswers);
        this.previewAnswersValidation = this.getPreviewAnswersValidation();
      }

      if (!this.editors.length) {

        this.editors = (await this.createPreviewEditors()) as Array<any>;
        //resolve(true);
        return true;

        //!kludge (does not work)
        // this.editors?.forEach((category, categoryIndex) => {
        //   category.questions.forEach((question, questionIndex) => {
        //     let editor = question.editor;
        //     //if(questionIndex == category.questions.length - 1){
        //     editor.addEventListener("json-form.update", (event) => {
        //       //category.questions.forEach((item, questionIndex) => {
        //       this.initQuestionPreviewForm(event, categoryIndex, questionIndex)
        //       //});
        //     });
        //     //editor.__proto__._dispatchEvent.call(editor, "json-form.update");
        //     //}
        //   });
        // })
      } else {
        //reject(false);
        return false;
      }
    } catch (error) {
      console.log("ERROR", error);
      //reject(false);
      return false;
    }
    //}, 1);
    //});
  }

  createPreviewEditors() {
    return new Promise((resolve, reject) => {
      let modelEditorElement = (this.preview?.nativeElement?.querySelector("#previewOptionsForm") as HTMLElement);
      let modelEditorElementTaxes = (this.preview?.nativeElement?.querySelector("#previewTaxes tbody") as HTMLElement);
      if (!modelEditorElement) reject([]);

      const tempContainer = document.createElement('div');
      const tempTaxContainer = document.createElement('div');

      let editors;
      editors = this.promotionData.categories.map((category, categoryIndex) => {

        let categoryEditor = (() => {
          let model = `previewAnswers.categories.${categoryIndex}.title`;
          let options = {
            body: tempContainer,
            pattern: /\[\-\s*([^\[\-]+)\s*\-\]/g,
            autoInit: false,
            model: `categories.${categoryIndex}.title`,// data-model="usage1"
            labels: {
              ...{
                [model]: category.name,
              },
              // ...window['previewAnswers'].categories.reduce((prev, cur, i)=>{
              //   prev[`previewAnswers.categories.${i}.title`] = cur['title'];

              //   return prev;
              // }, {})
            },
            attributes: {
              // 'previewAnswers.usage1.e.0.f': {
              //   "title": 'test2',
              //   "id": 'ef',
              //   "min": 0,
              //   "max": 10,
              //   "inputType": 'number',
              //   "class": "form-control is-invalid"
              // }
            },
            meta: {
              '*': {
                "fn": (args) => { console.log('args', args); return (args.value + '').toUpperCase(); }
              },
              [model]: {
                "categoryId": category.id || category.tempId,
                "description": category.description,
                "showHeadingsClass": category?.showHeadings == undefined ? '' : category.showHeadings ? '' : 'hidden',
                "className": toCamelCase(category.name)
              }
            },
            templates: {
              ...{
                //'*': this.getPreviewFormTemplates('generalTemplate')
                [model]: (() => {
                  let pattern = '<template></template>';
                  return document.getElementById("categoryTemplate") ? "categoryTemplate" : htmlToFragment(pattern).firstChild;
                })()
              },
              // ...window['previewAnswers'].categories.reduce((prev, cur, i)=>{
              //   prev[`previewAnswers.categories.${i}.title`] = 'categoryTemplate';
              //   return prev;
              // },{})
            },
            onchange: {
              //[model]: this.updatePreviewForm,
              //'previewAnswers.usage1.a.b.c': updatePreviewForm,
            },
            events: {
              [model]: "keyup keypress blur change",
              //"previewAnswers.usage1.a.b.c": "change"
            }
          };
          console.log('previewAnswers', window['previewAnswers'])
          let editor = this.jsonForm.create(window['previewAnswers'], options);
          if (editor?.init) editor.init();

          //editor.addEventListener("json-form.init", updatePreviewForm);
          //editor.addEventListener("json-form.update", updatePreviewForm);
          //editor.addEventListener("json-form.update.value", updatePreviewForm);
          //editor.addEventListener("json-form.update", (event)=>{this.initCategoryPreviewForm(event,categoryIndex)});
          return editor;
        })();

        return {
          [category?.id ? 'id' : 'tempId']: category?.id ? category?.id : category?.tempId,
          editor: categoryEditor,
          questions: category.questions.map((question, questionIndex) => {
            let questionType = Object.keys(question)[0];
            let questionData = question[questionType];
            let previewAnswersQuestion = window['previewAnswers'].categories[categoryIndex].questions[questionIndex];
            let questionEditor = (() => {
              let model = `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.title`;
              let options = {
                body: tempContainer.querySelector('#category-' + (category.id || category.tempId) + ' > tbody.model-editor'),
                pattern: /\[\-\s*([^\[\-]+)\s*\-\]/g,
                autoInit: false,
                model: `categories.${categoryIndex}.questions.${questionIndex}.title`,
                labels: {
                  [model]: questionData.title,
                },
                attributes: {
                },
                meta: {
                  [model]: {
                    "id": questionData.id || questionData.tempId,
                    "description": questionData.description,
                    "showHeadingsClass": questionData?.showHeadings == undefined ? '' : questionData?.showHeadings ? '' : 'hidden',
                    "paddingLeft": category.showHeadings ? '20px' : '0px',
                    "className": toCamelCase(questionData.title),
                    "required": questionData.mandatory ? "required" : ""
                  }
                },
                templates: {
                  //"*": 'generalTemplate'
                  [model]: (() => {
                    let template = this.getPreviewFormTemplates('emptyQuestion');
                    let isDisplayed = this.displayPreviewQuestion(categoryIndex, questionIndex);
                    let questionCost = isDisplayed ? this.getQuestionCost(category.id || category.tempId, questionData.id || questionData.tempId)?.cost || 0 : 0;
                    let questionQuantity = isDisplayed ? this.getQuestionCost(category.id || category.tempId, questionData.id || questionData.tempId)?.quantity || 0 : 0;

                    let getCurrencyText = (previewAnswersQuestion, i) => {

                      let hasAdditionalOption = (!questionData.mandatory && !questionData.selectMultiple);

                      if (questionData.pricing == "asIs") {
                        return previewAnswersQuestion.options.some(item => item.cost) ? previewAnswersQuestion?.options?.[i]?.cost ? ` @ ${this.currency} ${this.format(this.currencyFormat, previewAnswersQuestion?.options?.[i]?.cost || 0)} ${questionData.buyMultiple ? 'each' : ''}` : hasAdditionalOption ? '' : 'for free' : '';
                      } else {
                        if (questionData?.pricingMethod == 'perDay' && questionData?.pricingDependsOn && questionData?.optionCostsFixed == false) {
                          return previewAnswersQuestion.options.some(item => item.cost) ? previewAnswersQuestion?.options?.[i]?.cost ? ` @ ${this.currency} ${this.format(this.currencyFormat, (previewAnswersQuestion?.options?.[i]?.cost * previewAnswersQuestion?.options?.[i]?.quantity) || 0)} ${questionData.buyMultiple ? 'each' : ''}` : hasAdditionalOption ? '' : 'for free' : '';
                        } else {
                          let timeOfDay = questionData?.pricingDependencyMethod == "perNight" ? 'night' : 'day';

                          let previewCategory = window['previewAnswers'].categories[categoryIndex];
                          //let dependentDatesCost;
                          let dependentDatesQuantity = (() => { // pricing - perDate
                            let quantity = 0;
                            let requiredDependentQuestionType = questionData.pricingDependsOn ? Object.keys(questionData.pricingDependsOn)[0] : null;
                            if (requiredDependentQuestionType) {
                              let requiredDependentQuestionId = questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.id || questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.tempId;
                              let requiredDependentQuestionIndex = previewCategory.questions?.map(item => item.id || item.tempId)?.indexOf(requiredDependentQuestionId);
                              let requiredDependentQuestion = previewCategory.questions?.[requiredDependentQuestionIndex];
                              let dates = uniqueArr(requiredDependentQuestion?.dates || [], 'date');
                              if (dates?.length) {
                                quantity = questionData.pricingDependencyMethod == "perNight" ? dates?.length - 1 : dates?.length;
                              }
                              if (questionData.pricing == "perDate") {
                                if (questionData.optionCostsFixed == false) {
                                  if (questionData.pricingDependencyMethod == "perNight") dates = dates?.length > 1 ? dates.slice(1) : dates;
                                  //dependentDatesCost = getRequiredQuestionDatesCosts(categoryData.questions[requiredDependentQuestionIndex], dates);
                                }
                              }
                            }
                            return quantity;
                          })();

                          return previewAnswersQuestion.options.some(item => item.cost) ? ` @ ${this.currency} ${this.format(this.currencyFormat, dependentDatesQuantity ? (previewAnswersQuestion?.options?.[i]?.cost / dependentDatesQuantity) : 0)} ${questionData.buyMultiple ? 'per' + ' ' + timeOfDay : ''}` : '';
                        }
                      }
                    };

                    if (isDisplayed) {

                      switch (questionType) {
                        case QuestionTypes[0]: {
                          let hasAdditionalOption = (!questionData.mandatory && !questionData.selectMultiple);
                          let additionalOption = {
                            cost: 0,
                            description: "",
                            id: 0,
                            title: "None"
                          };

                          template = this.getPreviewFormTemplates('questionTemplate');
                          template = this.replacePatterns(template, {
                            notification: (() => {

                              let buyMinimum = questionData.buyMultiple.minimum;
                              let buyMaximum = questionData.buyMultiple.maximum;
                              let mandatory = questionData.mandatory;

                              let notificationRules = {
                                rule1: {
                                  text: `If purchasing, you must buy at least ${buyMinimum}`,
                                  condition: !mandatory && buyMinimum > 1 && buyMaximum == 0
                                },
                                rule2: {
                                  text: `If purchasing, you may buy a maximum of ${buyMaximum}`,
                                  condition: !mandatory && buyMinimum == 1 && buyMaximum != 0
                                },
                                rule3: {
                                  text: `If purchasing, you must buy between ${buyMinimum} and ${buyMaximum}`,
                                  condition: !mandatory && buyMinimum > 1 && buyMaximum != 0
                                },
                                rule4: {
                                  text: `You must buy at least ${buyMinimum}`,
                                  condition: mandatory && buyMinimum > 1 && buyMaximum == 0
                                },
                                rule5: {
                                  text: `You may only buy a maximum of ${buyMaximum}`,
                                  condition: mandatory && buyMinimum == 1 && buyMaximum != 0
                                },
                                rule6: {
                                  text: `You must buy between ${buyMinimum} and ${buyMaximum}`,
                                  condition: mandatory && buyMinimum > 1 && buyMaximum != 0
                                },
                                rule7: {
                                  text: `You may buy a maximum of ${buyMaximum}`,
                                  condition: mandatory && buyMinimum == 1 && buyMaximum != 0 && questionData.selectMultiple
                                }
                              };

                              let inTotalStr = questionData.selectMultiple ? ' (in total)' : '';
                              let ruleId = Object.keys(notificationRules).find(item => notificationRules[item]?.condition);
                              let textStr = ruleId ? notificationRules?.[ruleId]?.text : '';

                              return textStr ? `<div class="notification">${textStr + inTotalStr}</div>` : '';
                            })()
                          });

                          switch (questionData?.displayMethod || DisplayMethod[0]) {
                            case 'expandedList': {
                              let options = (hasAdditionalOption ? [additionalOption, ...questionData.options] : questionData.options);
                              template = this.replacePatterns(template, {
                                bodyTemplate: options.reduce((prev, cur, i, arr) => {
                                  if (hasAdditionalOption) i = i - 1;
                                  let currencyText = i < 0 ? '' : getCurrencyText(previewAnswersQuestion, i);
                                  let isInitialized = !!this.previousPreviewAnswers?.categories?.[categoryIndex]?.questions?.[questionIndex]?.options?.[i];
                                  let checked = previewAnswersQuestion.options.some(item => item.selected) ? previewAnswersQuestion.options?.[i]?.selected ? 'checked' : '' : hasAdditionalOption ? ((i < 0) ? 'checked' : '') : (i == 0 && (!questionData.selectMultiple && !isInitialized) || questionData.mandatory ? 'checked' : ''); //? questionData.mandatory
                                  let currentCheckedOptionIndex = previewAnswersQuestion.options.findIndex(item => item.selected);
                                  let quantity = previewAnswersQuestion?.options?.[i]?.quantity || 1;
                                  let pattern = cur.title && (i < 0 ? options.filter(item => item.title).length != 1 : true) ? this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', true), {
                                    input: this.replacePatterns(this.getPreviewFormTemplates(questionData.selectMultiple ? 'checkboxTemplate' : 'radioTemplate', true), {
                                      name: `question-${questionData.id || questionData.tempId}`,
                                      value: cur.title,
                                      checked: checked,
                                      required: questionData.mandatory ? 'required' : '',
                                      'checkbox-validator': questionData.mandatory ? 'checkbox-validator' : '',
                                      "data-path": i < 0 ? currentCheckedOptionIndex != -1 ? `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.options.${currentCheckedOptionIndex}.selected` : '' : `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.options.${i}.selected`,
                                      "data-type": 'boolean',
                                      "data-additional": (i < 0 ? true : false) + ''
                                    }, [undefined, '']),
                                    number: questionData.buyMultiple && i != -1 ? this.replacePatterns(this.getPreviewFormTemplates('numberTemplate', true), {
                                      value: quantity,// || questionData?.buyMultiple?.minimum || 1,
                                      minAttr: questionData?.buyMultiple?.minimum != undefined ? questionData.buyMultiple.minimum : 1,
                                      maxAttr: questionData?.buyMultiple?.maximum != undefined && questionData.buyMultiple.maximum != 0 ? questionData.buyMultiple.maximum : '',
                                      "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.options.${i}.quantity`,
                                      "data-type": 'number'
                                    }) : '',
                                    title: '<span>' + cur.title + '</span>' + '<span>' + currencyText + '</span>',
                                    description: cur.description,
                                    classText: 'price line' + ' ' + (!questionCost ? 'counter-list__hidden' : '') + ' ' + (checked ? '' : 'shaded'),
                                    value: this.format(this.currencyFormat, questionCost)
                                  }) : '';
                                  return prev + pattern;
                                }, ''),
                                taxesTitle: previewAnswersQuestion?.taxes?.reduce((prev, cur) => prev + cur?.cost, 0) || 0 ? questionData.title + ' ' + 'Taxes:' : '',
                                taxes: questionData?.taxes?.reduce((prev, cur, i) => {
                                  let pattern = '';

                                  let taxValue = this.getTaxValue(
                                    cur.tax.taxType,
                                    questionCost,
                                    questionQuantity,//question?.options?.reduce((prev,cur)=>prev + cur?.quantity,0) || 0,
                                    cur.amount
                                  );

                                  if (cur.tax.name && taxValue && previewAnswersQuestion?.options?.some(item => item.selected)) {
                                    pattern = this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', true), {
                                      title: cur.tax.name + ` @ ` + (cur.tax.taxType == TaxType[0] ? cur.amount + '%' : this.currency + " " + this.format(this.currencyFormat, cur.amount) + (cur.tax.taxType == TaxType[2] ? ' per purchase' : '')),
                                      value: this.format(this.currencyFormat, taxValue),
                                      description: ''
                                    })
                                  }
                                  return prev + pattern;
                                }, ''),
                                className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation.categories[categoryIndex].questions[questionIndex].valid ? '' : 'has-error has-danger')
                              });
                              break;
                            }
                            case 'dropdownMenu': {
                              let options = (hasAdditionalOption ? [additionalOption, ...questionData.options] : questionData.options);
                              template = this.replacePatterns(template, {
                                bodyTemplate: this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', true), {
                                  input: this.replacePatterns(this.getPreviewFormTemplates('selectTemplate', true), {
                                    name: `question-${questionData.id || questionData.tempId}`,
                                    noclose: questionData.selectMultiple ? 'noclose' : '',
                                    multiple: questionData.selectMultiple ? 'multiple' : '',
                                    required: questionData.mandatory ? 'required' : '',
                                    options: options.reduce((prev, cur, i) => {
                                      if (hasAdditionalOption) i = i - 1;
                                      let currencyText = i < 0 ? '' : getCurrencyText(previewAnswersQuestion, i);
                                      let selected = previewAnswersQuestion.options.some(item => item.selected) ? previewAnswersQuestion.options?.[i]?.selected ? 'selected' : '' : hasAdditionalOption ? ((i < 0) ? 'selected' : '') : (i == 0 && questionData.mandatory ? 'selected' : '');
                                      let currentCheckedOptionIndex = previewAnswersQuestion.options.findIndex(item => item.selected);
                                      let quantity = previewAnswersQuestion?.options?.[i]?.quantity || 1;
                                      let pattern = cur.title && (i < 0 ? options.filter(item => item.title).length != 1 : true) ? this.replacePatterns(this.getPreviewFormTemplates('optionTemplate', true), {
                                        value: cur.title,
                                        'data-content': escapeHtml(this.replacePatterns(this.getPreviewFormTemplates('dropdownContentTemplate', true), {
                                          number: questionData.buyMultiple && i != -1 ? this.replacePatterns(this.getPreviewFormTemplates('numberTemplate', true), {
                                            value: quantity,// || questionData?.buyMultiple?.minimum || 1,
                                            minAttr: questionData?.buyMultiple?.minimum != undefined ? questionData.buyMultiple.minimum : 1,
                                            maxAttr: questionData?.buyMultiple?.maximum != undefined && questionData.buyMultiple.maximum != 0 ? questionData.buyMultiple.maximum : '',
                                            "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.options.${i}.quantity`,
                                            "data-type": 'number'
                                          }) : '',
                                          title: cur.title + currencyText
                                        })),
                                        'optionDescription': cur.description,
                                        'optionCost': cur.cost,
                                        selected: selected,
                                        title: quantity < 1 || hasAdditionalOption ? cur.title : quantity + ' x ' + cur.title,// + currencyText,
                                        text: cur.title + currencyText,
                                        "data-path": i < 0 ? currentCheckedOptionIndex != -1 ? `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.options.${currentCheckedOptionIndex}.selected` : '' : `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.options.${i}.selected`,
                                        "data-type": 'boolean',
                                        "data-additional": (i < 0 ? true : false) + ''
                                      }) : '';
                                      return prev + pattern;
                                    }, '')
                                  }),
                                  // number: '',
                                  // title: '',
                                  // description'',
                                  classText: (!questionCost ? 'counter-list__hidden' : ''),
                                  value: this.format(this.currencyFormat, questionCost)
                                }),
                                taxesTitle: previewAnswersQuestion?.taxes?.reduce((prev, cur) => prev + cur?.cost || 0, 0) || 0 ? questionData.title + ' ' + 'Taxes:' : '',
                                taxes: questionData?.taxes?.reduce((prev, cur, i) => {
                                  let pattern = '';

                                  let taxValue = this.getTaxValue(
                                    cur.tax.taxType,
                                    questionCost,
                                    questionQuantity,//previewAnswersQuestion?.options?.reduce((prev,cur)=>prev + cur?.quantity,0) || 0,
                                    cur.amount
                                  );

                                  if (cur.tax.name && taxValue && previewAnswersQuestion?.options?.some(item => item.selected)) {
                                    pattern = this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', true), {
                                      title: cur.tax.name + ` @ ` + (cur.tax.taxType == TaxType[0] ? cur.amount + '%' : this.currency + " " + this.format(this.currencyFormat, cur.amount) + (cur.tax.taxType == TaxType[2] ? ' per purchase' : '')),
                                      value: this.format(this.currencyFormat, taxValue),
                                      description: ''
                                    })
                                  }
                                  return prev + pattern;
                                }, ''),
                                className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.valid ? '' : this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.touched ? 'has-error has-danger' : '')
                              });
                              break;
                            }
                          }

                          break;
                        }
                        case QuestionTypes[1]: {

                          template = this.getPreviewFormTemplates('questionTemplate');
                          template = this.replacePatterns(template, {
                            notification: ''
                          });

                          let dates = questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple ? (previewAnswersQuestion?.dates) : uniqueArr(previewAnswersQuestion?.dates, 'date');

                          let dataPath = '';
                          let currentPath = '';
                          template = this.replacePatterns(template, {
                            bodyTemplate: this.replacePatterns(this.getPreviewFormTemplates('dateQuestionBodyTemplate', true), {
                              datesTitle: (questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple ? dates.length > 1 : dates.length) ? `Selected Dates${questionData.buyMultiple ? ' & Quantities' : ''}` : '',
                              selectedDates: dates.reduce((prev, dateObj, i) => {
                                let pattern = this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', true),
                                  (() => {
                                    if (questionData.selectMultipleType == SelectionType[0] || !questionData.selectMultiple) {
                                      dataPath = `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.dates.${i}.quantity`;
                                      currentPath = dataPath;
                                    } else {
                                      dataPath = dates.reduce((prev, cur, i) => {
                                        let path = `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.dates.${i}.quantity`;
                                        prev = prev ? prev + ', ' + path : path;
                                        return prev
                                      }, '');
                                      currentPath = dataPath.split(',')[i].trim();
                                    }

                                    return {
                                      title: (() => {

                                        let perText = {
                                          'per': questionData.selectMultiple || questionData.buyMultiple,
                                          'person': questionData.buyMultiple,
                                          '/': questionData.selectMultiple && questionData.buyMultiple && (questionData?.pricingMethod == 'perDay' || questionData?.pricingMethod == 'perNight'),
                                          'day': questionData.selectMultiple && questionData?.pricingMethod == 'perDay',
                                          'night': questionData.selectMultiple && questionData?.pricingMethod == 'perNight',
                                        };

                                        let defaultAmount = (() => {
                                          let amount;
                                          if (
                                            questionData.selectMultipleType == SelectionType[1] &&
                                            questionData.selectMultiple
                                          ) {
                                            amount = dates.reduce((prev, dateObj, i) => {
                                              //let date = (moment(dateObj.date, this.datePattern) as any)._d;
                                              //let basePriceValue = this.getBasePriceValue(question, date);
                                              return prev + (dateObj?.cost || 0);// + basePriceValue;
                                            }, 0);
                                          } else {
                                            //let date = (moment(dateObj.date, this.datePattern) as any)._d;
                                            //let basePriceValue = this.getBasePriceValue(question, date);
                                            amount = (dateObj?.cost || 0);// + basePriceValue;
                                          }
                                          return amount;
                                        })();

                                        let defaultPerStr = Object.keys(perText).filter(text => perText[text]).join(' ');

                                        let arbitraryDate = (() => {
                                          let amountStr = (() => {
                                            let amount = defaultAmount;

                                            return this.format(this.currencyFormat, amount);
                                          })();
                                          let perStr = (() => {
                                            return defaultPerStr;
                                          })();

                                          return `
                                          <a class="glyphicon glyphicon-minus-sign remove"></a>
                                          <span class="parameter_name" style="display: inline-block;">${moment(new Date(dateObj.date)).format(new Date(dateObj.date).getMonth() == 4 ? "DD MMM" : "DD MMM.")}</span> 
                                          ${questionData.buyMultiple ? `<span>x</span>` +
                                              this.replacePatterns(this.getPreviewFormTemplates('numberTemplate', true), {
                                                value: (() => {
                                                  let editor = categoryEditor;//questionEditor;
                                                  let value = this.getParsedPath(editor, currentPath) || 1;
                                                  value = value < questionData?.buyMultiple?.minimum ? questionData?.buyMultiple?.minimum : value;
                                                  value = value || 1;// questionData.buyMultiple.maximum != undefined && questionData.buyMultiple.maximum != 0 && (value > questionData?.buyMultiple?.maximum) ? questionData?.buyMultiple?.maximum : value;
                                                  return value;
                                                })(),
                                                minAttr: questionData.buyMultiple.minimum != undefined ? questionData.buyMultiple.minimum : 1,
                                                maxAttr: questionData.buyMultiple.maximum != undefined && questionData.buyMultiple.maximum != 0 ? questionData.buyMultiple.maximum : '',
                                                required: questionData.mandatory ? 'required' : '',
                                                classText: 'text-end',
                                                "data-path": dataPath,
                                                "data-type": 'number'
                                              })
                                              : ''}
                                          `+ (questionCost ? `<span class="parameter_currency">${this.currency}</span>
                                          <span class="parameter_amount">${amountStr}</span>
                                          <span class="parameter_per">${perStr}</span>
                                          `: '');
                                        })();

                                        let uniqueDatesObjArray = uniqueArr(dates.map((dateObj) => {
                                          //let date = (moment(dateObj.date, this.datePattern) as any)._d;
                                          //let basePriceValue = this.getBasePriceValue(question, date);
                                          return {
                                            cost: dateObj.cost,
                                            //basePriceValue
                                          }
                                        }, 'cost'));

                                        let dateRange = (() => {
                                          let amountStr = (() => {
                                            let amount;

                                            if (
                                              (uniqueDatesObjArray.length === 1) ||
                                              (
                                                uniqueDatesObjArray.length === 2 &&
                                                dates[dates.length - 1]?.cost === 0
                                              ) &&
                                              questionData?.pricingMethod === 'perNight'
                                            ) {
                                              let dateObj = uniqueDatesObjArray[0];
                                              amount = dateObj.cost;// + dateObj.basePriceValue;
                                            } else {
                                              amount = defaultAmount;
                                            }

                                            return this.format(this.currencyFormat, amount);
                                          })();

                                          let perStr = (() => {
                                            return (uniqueDatesObjArray.length == 1) ? defaultPerStr : ''
                                          })();

                                          return dates.length >= 2 ? `
                                            <a class="glyphicon glyphicon-minus-sign remove"></a>
                                            <span class="parameter_name" style="display: inline-block;">
                                            ${dates[0].date == dates[dates.length - 1].date ? moment(new Date(dates[0].date)).format(new Date(dates[0].date).getMonth() == 4 ? "DD MMM" : "DD MMM.") : moment(new Date(dates[0].date)).format(new Date(dates[0].date).getMonth() == 4 ? "DD MMM" : "DD MMM.") + " - " + moment(new Date(dates[dates.length - 1].date)).format(new Date(dates[dates.length - 1].date).getMonth() == 4 ? "DD MMM" : "DD MMM.")}
                                            </span>
                                            ${questionData.buyMultiple ? `<span>x</span>` +
                                              this.replacePatterns(this.getPreviewFormTemplates('numberTemplate', true), {
                                                value: (() => {
                                                  let editor = categoryEditor;//questionEditor;
                                                  let value = this.getParsedPath(editor, currentPath) || 1;
                                                  value = value < questionData?.buyMultiple?.minimum ? questionData?.buyMultiple?.minimum : value;
                                                  value = value || 1; //questionData.buyMultiple.maximum != undefined && questionData.buyMultiple.maximum != 0 && (value > questionData?.buyMultiple?.maximum) ? questionData?.buyMultiple?.maximum : value;
                                                  return value;
                                                })(),
                                                minAttr: questionData.buyMultiple.minimum != undefined ? questionData.buyMultiple.minimum : 1,
                                                maxAttr: questionData.buyMultiple.maximum != undefined && questionData.buyMultiple.maximum != 0 ? questionData.buyMultiple.maximum : '',
                                                required: questionData.mandatory ? 'required' : '',
                                                classText: 'text-end',
                                                "data-path": dataPath,
                                                "data-type": 'number'
                                              })
                                              : ''}
                                          ` + (questionCost ? `<span class="parameter_currency">${this.currency}</span>
                                          <span class="parameter_amount">${amountStr}</span>
                                          <span class="parameter_per">${perStr}</span>
                                          `: '') : '';
                                        })();

                                        return questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple ? dateRange : arbitraryDate;

                                      })(),

                                      //dateObj.tax.name + ` @ ` + (dateObj.tax.taxType == TaxType[0] ? dateObj.amount + '%' : this.currency + " " + this.format(this.currencyFormat, dateObj.amount)),
                                      description: dateObj.date,
                                      classText: 'price line' + ' ' + (!questionCost ? 'counter-list__hidden' : ''),
                                      value: this.format(this.currencyFormat, questionCost)
                                    }
                                  })()
                                );
                                return prev + (questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple ? i == 1 ? pattern : '' : pattern)
                              }, ''),
                              required: questionData.mandatory ? 'required' : '',
                              multiple: questionData.selectMultiple ? 'multiple' : '',
                              dateRange: questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple ? 'dateRange' : '',
                              datesNotificationClass: (() => {
                                let promotionData = this.promotionData;
                                let datePattern = this.datePattern;
                                let multipleDate = (() => {
                                  return questionData.dates == 'same' ?
                                    (() => {
                                      if (promotionData.promotionDate == 'specific') {
                                        return promotionData?.promotionDates?.staticDates?.dates || [];
                                      } else if (promotionData.promotionDate == 'recurring') {
                                        if (promotionData.endRecurrence == 'limited') {
                                          return getDates((moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d, (moment(promotionData.promotionDates.recurringDates.lastDate, datePattern) as any)._d).map(date => moment(date).format(datePattern));
                                        } else {
                                          return [(moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d].map(date => moment(date).format(datePattern));
                                        }
                                      } else {
                                        return [];
                                      }
                                    })()
                                    : Object.keys(questionData?.possibleDates?.staticDatesWithPricing?.dates || promotionData?.promotionDates?.staticDates?.dates || {})
                                })();
                                let blockedDatesArray = Object.keys(promotionData?.blockedDates || {});

                                return multipleDate.some(date => blockedDatesArray.includes(date)) ? '' : 'hidden';

                              })(),
                              'data-start-date-picker': (() => {
                                let sortedDates = Object.keys(questionData?.possibleDates?.staticDatesWithPricing?.dates || this.promotionData?.promotionDates?.staticDates?.dates || {}).filter(item => item && this.momentIsDate(item, this.datePattern)).sort((a, b) => (moment(a, this.datePattern) as any)._d - (moment(b, this.datePattern) as any)._d) || [];
                                let recurringFirstDate = this.promotionData?.promotionDates?.recurringDates?.firstDates?.length && this.promotionData?.promotionDates?.recurringDates?.lastDate ? this.promotionData?.promotionDates?.recurringDates?.firstDates[0] : '';
                                return (this.promotionData?.promotionDates?.recurringDates && questionData.dates == 'same' ? recurringFirstDate : sortedDates[0]) || '';
                              })(),
                              'data-end-date-picker': (() => {
                                let sortedDates = Object.keys(questionData?.possibleDates?.staticDatesWithPricing?.dates || this.promotionData?.promotionDates?.staticDates?.dates || {}).filter(item => item && this.momentIsDate(item, this.datePattern)).sort((a, b) => (moment(a, this.datePattern) as any)._d - (moment(b, this.datePattern) as any)._d) || [];
                                let recurringLastDate = this.promotionData?.promotionDates?.recurringDates?.firstDates?.length && this.promotionData?.promotionDates?.recurringDates?.lastDate ? this.promotionData?.promotionDates?.recurringDates?.lastDate : '';
                                return (this.promotionData?.promotionDates?.recurringDates && questionData.dates == 'same' ? recurringLastDate : sortedDates[sortedDates.length - 1]) || '';
                              })(),
                              'data-min-days': questionData?.selectMultiple?.minimum || '',
                              'data-max-days': questionData?.selectMultiple?.maximum || '',
                              value: this.format(this.currencyFormat, questionCost)
                            }),
                            colspan: 2,
                            taxesTitle: previewAnswersQuestion?.taxes?.reduce((prev, cur) => prev + cur?.cost || 0, 0) || 0 ? questionData.title + ' ' + 'Taxes:' : '',
                            taxes: questionData?.taxes?.reduce((prev, cur, i) => {
                              let pattern = '';

                              let taxValue = this.getTaxValue(
                                cur.tax.taxType,
                                questionCost,
                                previewAnswersQuestion?.dates?.reduce((prev, cur) => prev + cur?.quantity, 0) || 0,
                                cur.amount
                              );

                              if ((questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple ? dates.length >= 2 : dates.length) && (cur.tax.name && taxValue)) {
                                pattern = this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', true), {
                                  title: cur.tax.name + ` @ ` + (cur.tax.taxType == TaxType[0] ? cur.amount + '%' : this.currency + " " + this.format(this.currencyFormat, cur.amount) + (cur.tax.taxType == TaxType[2] ? ' per purchase' : '')),
                                  colspan: 2,
                                  value: this.format(this.currencyFormat, taxValue),
                                  description: ''
                                })
                              }

                              return prev + pattern;
                            }, ''),
                            className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.valid ? '' : this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.touched ? 'has-error has-danger' : '')
                          });

                          break;
                        }
                        case QuestionTypes[2]: {

                          template = this.getPreviewFormTemplates('shortTextQuestionTemplate');
                          let isInitialized = this.templateReady;

                          switch (questionData.contentType || ContentType[0]) {
                            case ContentType[0]: {
                              template = this.replacePatterns(template, {
                                value: isInitialized ? previewAnswersQuestion.shortText || '' : previewAnswersQuestion.shortText = questionData.defaultValue || '',
                                inputType: 'text',
                                title: stripHTML(questionData.description),
                                placeholder: stripHTML(questionData.description),
                                required: questionData.mandatory ? 'required' : '',
                                "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.shortText`,
                                "data-type": 'string',
                                className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.valid ? '' : this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.touched ? 'has-error has-danger' : '')

                              })

                              break;
                            }
                            case ContentType[1]: {
                              template = this.replacePatterns(template, {
                                value: isInitialized ? previewAnswersQuestion.shortText || '' : previewAnswersQuestion.shortText = questionData.defaultValue || '',
                                inputType: 'email',
                                title: stripHTML(questionData.description),
                                placeholder: stripHTML(questionData.description),
                                required: questionData.mandatory ? 'required' : '',
                                "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.shortText`,
                                "data-type": 'string',
                                className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.valid ? '' : this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.touched ? 'has-error has-danger' : '')
                              });

                              break;
                            }
                            case ContentType[2]: {

                              template = this.replacePatterns(template, {
                                value: isInitialized ? previewAnswersQuestion.shortText || '' : previewAnswersQuestion.shortText = questionData.defaultValue || '',
                                inputType: 'tel',
                                title: stripHTML(questionData.description),
                                placeholder: stripHTML(questionData.description),
                                required: questionData.mandatory ? 'required' : '',
                                "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.shortText`,
                                "data-type": 'string',
                                className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.valid ? '' : this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.touched ? 'has-error has-danger' : '')
                              });
                              break;
                            }
                            case ContentType[3]: {

                              template = this.getPreviewFormTemplates('questionTemplate');
                              template = this.replacePatterns(template, {
                                notification: ''
                              });

                              template = this.replacePatterns(template, {
                                bodyTemplate: this.replacePatterns(this.getPreviewFormTemplates('valueBodyTemplate', true), {
                                  number: this.replacePatterns(this.getPreviewFormTemplates('numberTemplate', true), {
                                    value: questionCost || 1,// || questionData?.valueLimits.minimum || 0,
                                    minAttr: questionData.valueLimits.minimum != undefined ? questionData.valueLimits.minimum : 1,
                                    maxAttr: questionData.valueLimits.maximum != undefined && questionData.valueLimits.maximum != 0 ? questionData.valueLimits.maximum : '',
                                    required: questionData.mandatory ? 'required' : '',
                                    "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.shortText`,
                                    "data-type": 'number',
                                  }),
                                  description: questionData.description,
                                  currency: this.currency,
                                  value: this.format(this.currencyFormat, questionCost),
                                  className: toCamelCase(questionData.title) + ' ' + (this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.valid ? '' : this.previewAnswersValidation?.categories?.[categoryIndex]?.questions?.[questionIndex]?.touched ? 'has-error has-danger' : '')
                                })
                              });

                              break;
                            }
                          }

                          break;
                        }
                        case QuestionTypes[3]: {

                          template = this.getPreviewFormTemplates('questionTemplate');
                          template = this.replacePatterns(template, {
                            bodyTemplate: this.replacePatterns(this.getPreviewFormTemplates('longTextQuestionBodyTemplate', true), {
                              value: previewAnswersQuestion.longText || previewAnswersQuestion.shortText || '',
                              required: questionData.mandatory ? 'required' : '',
                              "data-path": `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.longText`,
                              "data-type": 'string'
                            })
                          });

                          break;
                        }
                      }
                    }

                    return htmlToFragment(template).firstChild;

                  })()
                },
                onchange: {
                  // [model]: this.updatePreviewForm,
                },
                events: {
                  [model]: "keyup keypress blur change",
                }
              };
              let editor = this.jsonForm.create(window['previewAnswers'], options);
              if (editor?.init) editor.init();

              // editor.addEventListener("json-form.init", (event)=>{
              //   let prewiewCategory = event.srcElement.parentElement;
              //   let prewiewQuestion = event.srcElement.children[questionIndex].querySelector('.question') ;
              //   let category = this.promotionData.categories[categoryIndex];
              //   let question = category.questions[questionIndex];
              //   let questionType = Object.keys(question)[0];
              //   if(prewiewQuestion){
              //     [...prewiewQuestion.querySelectorAll('[data-path]')].forEach(input => {
              //       input.addEventListener('change',(event)=>{
              //         var dataType = event.target.dataset.type || '';
              //         var dataPath = event.target.dataset.path || '';
              //         if(dataPath){
              //           let editor = this.editors[categoryIndex].questions[questionIndex].editor;
              //           //editor.__proto__.update();
              //           editor.update();
              //         }
              //       });
              //     });
              //   }
              // });


              editor.addEventListener("json-form.custom", (event) => {
                this.initQuestionPreviewForm(event, categoryIndex, questionIndex)
              });
              if (questionIndex == category.questions.length - 1) {
                editor.__proto__._dispatchEvent.call(editor, "custom"); //*kludge (works)
              }

              // editor.addEventListener("json-form.update", (event) => {
              //       this.initQuestionPreviewForm(event, categoryIndex, questionIndex)
              // });
              // editor.__proto__._dispatchEvent.call(editor, "json-form.update"); //*kludge (almost works)


              return editor;
            })();
            return {
              [questionData?.id ? 'id' : 'tempId']: questionData?.id ? questionData?.id : questionData?.tempId,
              editor: questionEditor,
            }
          })
        }
      });

      let taxesEditors = !window['previewAnswers']?.taxes ? [] : this.promotionData?.taxes?.map((tax, index) => {
        let taxesModel = `previewAnswers.taxes.${index}.title`;
        let taxesEditorOptions = {
          body: tempTaxContainer,
          pattern: /\[\-\s*([^\[\-]+)\s*\-\]/g,
          autoInit: false,
          model: `taxes.${index}.title`,
          templates: {
            //"*": 'taxTemplate'
            [taxesModel]: (() => {

              let template = (() => {
                let pattern = '<template></template>';

                let taxValue = window['previewAnswers'].taxes[index].cost;

                if (taxValue) {
                  pattern = this.replacePatterns(this.getPreviewFormTemplates('lineTemplate', false), {
                    title: tax.tax.name + ` @ ` + (tax.tax.taxType == TaxType[0] ? tax.amount + '%' : this.currency + " " + this.format(this.currencyFormat, tax.amount) + (tax.tax.taxType == TaxType[2] ? ' per purchase' : '')),
                    colspan: 2,
                    value: this.format(this.currencyFormat, taxValue),
                    description: ''
                  }, undefined, false);
                }
                return pattern;
              })();

              let el = htmlToFragment(template).firstChild;
              return el;
            })()
          }
        };

        let editor = this.jsonForm.create(window['previewAnswers'], taxesEditorOptions);
        if (editor?.init) editor.init();

        return {
          ...tax,
          editor: editor
        }

      });

      requestAnimationFrame(() => {
        if (modelEditorElement) {
          modelEditorElement.innerHTML = '';
          while (tempContainer.firstChild) {
            modelEditorElement.appendChild(tempContainer.firstChild);
          }
        }

        if (modelEditorElementTaxes) {
          modelEditorElementTaxes.innerHTML = '';
          while (tempTaxContainer.firstChild) {
            modelEditorElementTaxes.appendChild(tempTaxContainer.firstChild);
          }
        }
      });

      resolve(editors);

    });
  }

  displayPreviewQuestion(categoryIndex, questionIndex, previewAnswers?) {
    //return true;
    //if ((deepCompare as any)(this.previousPreviewAnswers, window['previewAnswers']) && this.preview) {
    previewAnswers = previewAnswers || window['previewAnswers'];
    let category = this.promotionData.categories[categoryIndex];
    let question = category.questions[questionIndex];
    let questionType = Object.keys(question)[0];
    let questionData = question[questionType];
    if (questionData.display == 'always') {
      return true;
    } else if ((questionData.display == 'conditional' || questionData?.displayCriteria?.comparisonQuestion) && previewAnswers) {

      let comparisonQuestionId = (() => {
        let type = questionData?.displayCriteria?.comparisonQuestion ? Object.keys(questionData.displayCriteria.comparisonQuestion)[0] : null;
        return type ? questionData.displayCriteria.comparisonQuestion[type]?.id || questionData.displayCriteria.comparisonQuestion[type]?.tempId : null;
      })();

      let requiredData = this.getRequiredPreviewData(previewAnswers, category.id || category.tempId, comparisonQuestionId);
      let comparisonQuestion = category.questions[requiredData.questionIndex];
      if (!comparisonQuestion) return false;
      let comparisonQuestionType = Object.keys(comparisonQuestion)[0];
      let comparisonPreviewQuestion = requiredData.question;
      let comparisonType = questionData.displayCriteria.comparisonType;
      let comparisonValue: Array<any> = (() => {
        let value = questionData?.displayCriteria?.comparisonValue || '';
        switch (comparisonQuestionType) {
          case QuestionTypes[0]: {
            return value.split(/[,;]/gim).map(item => item.trim());
          }
          case QuestionTypes[1]: {
            return value.split(/[,;]/gim).map(item => item.trim());
          }
          case QuestionTypes[2]: {
            return [value].map(item => item.trim());
          }
          case QuestionTypes[3]: {
            return [value].map(item => item.trim());
          }
        }
      })();

      let comparisonQuestionValue = (() => {
        switch (comparisonQuestionType) {
          case QuestionTypes[0]: {
            return comparisonPreviewQuestion?.options?.filter(item => item.selected).map(item => item.title.trim() || '').length ?
              comparisonPreviewQuestion?.options?.filter(item => item.selected).map(item => item.title.trim() || '') : [''];
          }
          case QuestionTypes[1]: {
            return comparisonPreviewQuestion?.dates?.map(item => item?.date?.trim() || '').length ?
              comparisonPreviewQuestion?.dates?.map(item => item?.date?.trim() || '') : [''];
          }
          case QuestionTypes[2]: {
            return [comparisonPreviewQuestion?.shortText || ''].map(item => item.trim());
          }
          case QuestionTypes[3]: {
            return [comparisonPreviewQuestion?.longText || ''].map(item => item.trim());
          }
        }
      })();

      let comparisonQuestionValueId = (() => {
        switch (comparisonQuestionType) {
          case QuestionTypes[0]: {
            return comparisonPreviewQuestion?.options?.filter(item => item.selected).map(item => (item?.id || item.tempId) + '').length ?
              comparisonPreviewQuestion?.options?.filter(item => item.selected).map(item => (item?.id || item.tempId) + '') : [''];
          }
          default: {
            return undefined
          }
        }
      })();

      return checkConditionGeneric({
        value: comparisonQuestionValue,
        operator: comparisonType,
        comparisonValue: comparisonValue
      }) || (
          comparisonQuestionValueId ?
            checkConditionGeneric({
              value: comparisonQuestionValueId,
              operator: comparisonType,
              comparisonValue: comparisonValue
            }) : false
        );

    } else if (questionData.display == 'never') {
      return false;
    } else {
      return true;
    }
    // } else {
    //   return true
    // }
  }

  getBasePriceValue(question, date) {
    let questionType = Object.keys(question)[0];
    let questionData = question[questionType];
    let value;
    let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let thisDay = days[date.getDay()];
    value = questionData?.basePrices?.[thisDay] || 0;
    return value;
  }

  getQuestionCost(categoryId, questionId, addTaxes?) {
    addTaxes = !!addTaxes;
    let previewAnswers = window['previewAnswers'];
    let promotionData = this.promotionData;

    let cost = 0;
    let quantity = 0;
    let taxValue = 0;

    for (let previewCategory of previewAnswers.categories) {

      let categoryData = promotionData.categories.filter(category => category.id == categoryId || category.tempId == categoryId)[0];

      if (previewCategory.id == categoryId || previewCategory.tempId == categoryId) {

        for (let previewQuestion of previewCategory.questions) {

          let question = categoryData.questions.filter(question => {
            let questionType = Object.keys(question)[0];
            let questionData = question[questionType];
            return questionData.id == questionId || questionData.tempId == questionId
          })[0];
          let questionType = Object.keys(question)[0];
          let questionData = question[questionType];

          if (previewQuestion.id == questionId || previewQuestion.tempId == questionId) {
            let keys = Object.keys(previewQuestion);
            let _this = this;
            let datePattern = this.datePattern;

            function getRequiredQuestionDatesCosts(question, requiredQuestionDates) {
              let cost = 0;
              let quantity = 0;
              let questionType = Object.keys(question)[0];
              let questionData = question[questionType];
              for (let i = 0; i < requiredQuestionDates.length; i++) {
                let questionId = (questionData.id || questionData.tempId);
                let dates = requiredQuestionDates;
                let dateObj = dates[i];
                let date = (moment(dateObj.date, datePattern) as any)._d;

                let basePriceValue = _this.getBasePriceValue(question, date);

                let controlQuestionsPrice = (() => { // display - never
                  let price = 0;
                  for (let controlQuestion of categoryData.questions) {
                    let controlQuestionType = Object.keys(controlQuestion)[0];
                    let controlQuestionId = (controlQuestion[controlQuestionType].id || controlQuestion[controlQuestionType].tempId);

                    if (controlQuestion[controlQuestionType].sameValueAs == questionId) {
                      //let requiredControlQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(controlQuestionId);
                      //let requiredControlQuestion = requiredСategory?.questions?.[requiredControlQuestionIndex ];
                      price = getRequiredQuestionDatesCosts(controlQuestion, requiredQuestionDates).cost;
                      break;
                    }
                  }
                  return price;
                })();

                cost += ((() => {
                  let cost = ((questionData?.possibleDates?.staticDatesWithPricing?.dates?.[dateObj.date] || 0) + basePriceValue);
                  let sameDate = dates?.[i - 1]?.date == dates[i].date;

                  if (questionData.pricingMethod == "perDay") {
                    if (sameDate) {
                      return 0
                    } else {
                      return cost;
                    }
                  } else if (questionData.pricingMethod == "perNight") {
                    if ((i != dates.length - 1) || (dates.length == 1)) {
                      return cost;
                    } else {
                      return 0;
                    }
                  } else if (questionData.pricingMethod == "dontApply") {
                    return 0;
                  }

                  // if (sameDate) {
                  //   return 0
                  // } else {
                  //   return cost;
                  // }

                })() + controlQuestionsPrice) * (dateObj.quantity || 1);

                quantity += (dateObj.quantity || 0);
              }
              return {
                cost: cost,
                quantity: quantity
              };
            }

            if (keys.includes('dates')) {
              cost += getRequiredQuestionDatesCosts(question, previewQuestion['dates']).cost;
              quantity += getRequiredQuestionDatesCosts(question, previewQuestion['dates']).quantity;
            } else if (keys.includes('options')) {
              for (let i = 0; i < previewQuestion['options'].length; i++) {
                if (previewQuestion['options'][i].selected) {
                  let category = this.promotionData.categories.find(item => (item.id == categoryId) || (item.tempId == categoryId));

                  let comparisonQuestionId = (() => {
                    let type = questionData?.displayCriteria?.comparisonQuestion ? Object.keys(questionData.displayCriteria.comparisonQuestion)[0] : null;
                    return type ? questionData.displayCriteria.comparisonQuestion[type]?.id || questionData.displayCriteria.comparisonQuestion[type]?.tempId : null;
                  })();

                  let requiredData = this.getRequiredPreviewData(previewAnswers, categoryId, comparisonQuestionId);
                  let comparisonQuestion = category.questions[requiredData.questionIndex];

                  let requiredDependentQuestionType = questionData.pricingDependsOn ? Object.keys(questionData.pricingDependsOn)[0] : null as any;
                  let requiredDependentQuestionId = questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.id || questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.tempId;
                  let requiredDependentQuestionIndex = previewCategory.questions?.map(item => item.id || item.tempId)?.indexOf(requiredDependentQuestionId);
                  let requiredDependentQuestion = previewCategory.questions?.[requiredDependentQuestionIndex];

                  let comparisonType = questionData?.displayCriteria?.comparisonType;
                  let comparisonQuestionType = comparisonQuestion ? Object.keys(comparisonQuestion)[0] : null;
                  let comparisonValue: Array<any> = (() => {
                    let value = questionData?.displayCriteria?.comparisonValue || '';
                    switch (comparisonQuestionType) {
                      case QuestionTypes[0]: {
                        return value.split(/[,;]/gim).map(item => item.trim());
                      }
                      case QuestionTypes[1]: {
                        return value.split(/[,;]/gim).map(item => item.trim());
                      }
                      case QuestionTypes[2]: {
                        return [value].map(item => item.trim());
                      }
                      case QuestionTypes[3]: {
                        return [value].map(item => item.trim());
                      }
                    }
                  })();

                  let dependentDatesCost = 0;//optionCostsFixed
                  let dependentDatesQuantity = (() => { // pricing - perDate
                    let quantity = 0;
                    if (requiredDependentQuestionType) {
                      let dates = uniqueArr(requiredDependentQuestion?.dates || [], 'date').filter(item => {
                        //check display
                        if (questionData.display == 'always') {
                          return true;
                        } else if (questionData.display == 'conditional') {
                          return checkConditionGeneric({
                            value: item?.date ? [item?.date] : [],
                            operator: comparisonType,
                            comparisonValue: comparisonValue
                          });
                        } else if (questionData.display == 'never') {
                          return false;
                        } else {
                          return true;
                        }
                      });
                      if (dates?.length) {
                        quantity = questionData.pricingDependencyMethod == "perNight" ? dates?.length - 1 : dates?.length;
                      }
                      if (questionData.pricing == "perDate") {
                        if (questionData.optionCostsFixed == false) {
                          if (questionData.pricingDependencyMethod == "perNight") dates = dates?.length > 1 ? dates.slice(1) : dates;
                          dependentDatesCost = getRequiredQuestionDatesCosts(categoryData.questions[requiredDependentQuestionIndex], dates).cost;
                        }
                      }
                    }
                    return quantity;
                  })();

                  let dependentOptionsQuantity = (() => { // pricing - perQuantity
                    let quantity = 0;
                    if (requiredDependentQuestionType) {
                      let optionsLength = requiredDependentQuestion?.options?.filter(item => {
                        return item.selected && (() => {
                          //check display
                          if (questionData.display == 'always') {
                            return true;
                          } else if (questionData.display == 'conditional') {
                            return checkConditionGeneric({
                              value: item?.date ? [item?.date] : [],
                              operator: comparisonType,
                              comparisonValue: comparisonValue
                            });
                          } else if (questionData.display == 'never') {
                            return false;
                          } else {
                            return true;
                          }
                        })();
                      }).length;
                      if (optionsLength) {
                        quantity = optionsLength;
                      }
                    }
                    return quantity;
                  })();

                  cost += (((questionData.options[i].cost) * (questionData.pricing != "asIs" ? dependentDatesQuantity + dependentOptionsQuantity : 1)) * previewQuestion['options'][i].quantity) + dependentDatesCost || 0;
                  quantity += previewQuestion['options'][i].quantity;
                }
              }
            } else if (keys.includes('shortText')) {
              if (questionData.contentType == ContentType[3]) {
                cost += +previewQuestion['shortText'];
                quantity += 1;
              }
            } else if (keys.includes('longText')) {

            }

            if (questionData.taxes && questionData.taxes.length && (previewQuestion?.options?.some(item => item.selected) || previewQuestion?.dates?.some(item => item.selected))) {
              for (let tax of questionData.taxes) {
                taxValue += this.getTaxValue(
                  tax.tax.taxType,
                  cost,
                  quantity,
                  tax.amount
                );
              }
            }

          }
        }
      }
    }

    return {
      cost: addTaxes ? cost + taxValue : cost,
      quantity: quantity
    };

  }

  getTaxValue(taxType, questionCost, questionQuantity, taxAmount) {
    if (taxType == "percentage") {
      return questionCost * (taxAmount / 100);
    } else if (taxType == "fixed") {
      return taxAmount;
    } else if (taxType == "perUnit") {
      return questionQuantity * taxAmount
    }
  }

  getParsedPath(editor, path) {
    let parsedPathData = this.jsonForm.Engine.prototype._parsePath.call(editor, path);//old:this.JsonForm.prototype._parsePath;
    return parsedPathData.object[parsedPathData.parameter]
  }

  updateEditorValue(editor, dataPath, value, dataType) {
    dataPath.split(',').forEach(path => {
      path = path.trim();
      //this.JsonForm.prototype._updateValue.call(editor, path, value, dataType);//old
      (this.jsonForm?.Engine?.prototype?._updateData || this.jsonForm?.Engine?.prototype?._updateValue).call(editor, path, value, dataType);
    });
  }



  async updatePreviewForm(event, value, path, type) {// Occupancy previewAnswers.categories.0.questions.1.title string
    if (event.type == 'change') {
      try {
        //this.updatePreviewOptionsHtml();
        this.updatePreview();
      } catch (error) {
        //console.log('ERROR',error)
      }
    }
    //_this.editors?.update();
  }

  public updatePreviewOptionsHtml() {
    this.templateUpdated = false;
    var modelEditorElement = (this.preview?.nativeElement?.querySelector("#previewOptionsForm") as HTMLElement);
    if (modelEditorElement) this.previewOptionsHtml = modelEditorElement.outerHTML;

  }

  initCategoryPreviewForm(event, categoryIndex) {
    let prewiewCategory = event.srcElement.children[categoryIndex];
  }

  initQuestionPreviewForm(event, categoryIndex, questionIndex) {
    let prewiewCategory = event.srcElement.parentElement;
    let prewiewQuestion = event.srcElement.children[questionIndex].querySelector('.question');
    let promotionData = this.promotionData;
    let category = promotionData.categories[categoryIndex];
    let question = category.questions[questionIndex];
    let questionType = Object.keys(question)[0];
    let questionData = question[questionType];
    let datepicker = prewiewQuestion?.querySelector('.dateInput');
    let select = prewiewQuestion?.querySelector('select');

    if (datepicker && window['previewAnswers']) {

      let datepickerDirectiveInstance = new AirDatepickerDirective({ nativeElement: datepicker });
      let datepickerOptions = {
        onSelect: datepickerSelectHandler,
        onRenderCell: datepickerRenderCellHandler,
        includeTemporaryInSelected: true
      }
      let requiredData = this.getRequiredPreviewData(window['previewAnswers'], category.id || category.tempId, questionData.id || questionData.tempId);
      let requiredQuestion = requiredData?.question;
      let requiredCategoryIndex = requiredData.categoryIndex;
      let requiredQuestionIndex = requiredData.questionIndex;
      // let previousQuestion = this.previousPromotionData.categories[requiredData.categoryIndex].questions[requiredData.questionIndex];
      // let previousQuestionType = Object.keys(previousQuestion)[0];

      let dataType = 'object';
      let dataPath = `previewAnswers.categories.${categoryIndex}.questions.${questionIndex}.dates`;

      let _this = this;

      let datepickerInstance = datepicker.datepickerInstance ? datepicker.datepickerInstance : datepickerDirectiveInstance.initDatepicker(datepicker, datepickerOptions);

      //let dates = requiredQuestion?.dates?.map(item => (moment(item.date) as any)._d) || [];

      let dates = (() => {
        let datesArray = requiredQuestion?.dates?.sort((a, b) => a - b) || [];
        let dates = datesArray?.reduce((prev, item) => {
          let date = (moment(item.date, this.datePattern) as any)._d;
          if (!datepickerInstance.isDateDisabled(date)) {
            prev.push(date);
          }
          return prev
        }, []);

        if (questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple) {
          let range = getDates(dates?.[0], dates?.[dates.length - 1] ? dates[dates.length - 1] : dates[0]) || [];
          //return range[range.length-1] != range[0] ? [range[0], range[range.length-1]] : requiredQuestion?.dates.length ? [range[0], range[range.length-1]] :[range[0]];
          return range.length != 1 ? [range[0], range[range.length - 1]] : dates;
        } else {
          return dates;
        }
      })();

      console.log(datepickerInstance, dates);
      datepickerInstance.selectDate(dates, { silent: true });

      /*air-datepicker handlers*/
      async function datepickerSelectHandler(...args) {
        _this.templatePending = true;
        let options = args.length == 1 || typeof args[0] == 'object' ? args[0] : { formattedDate: args[0], date: args[1], datepicker: args[2] };
        let { formattedDate, date, datepicker } = options;

        let editor = _this.editors[categoryIndex]?.questions[questionIndex]?.editor;

        let datesArray = (() => {
          let isMultipleDateRange = !!(questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple);
          let range = getDates(datepicker.selectedDates[0], datepicker.selectedDates[datepicker.selectedDates.length - 1]);
          return datepicker.selectedDates ?
            (
              isMultipleDateRange ? range.length != 1 || range.length < questionData.selectMultiple.minimum ? range : datepicker.selectedDates : datepicker.selectedDates
            ).map(date => {
              let dateStr = moment(date).format('YYYY-MM-DD');
              let dateStrIndex = requiredQuestion?.dates?.map(item => item.date)?.indexOf(dateStr);
              let data = requiredQuestion?.dates?.[dateStrIndex];
              return {
                date: dateStr,
                quantity: data?.quantity || 1,
                cost: questionData?.possibleDates?.staticDatesWithPricing?.dates?.[date] || 0,
                totalCost: data?.totalCost || 0
              }
            })
            : [];
        })();

        if (editor) {
          _this.updateEditorValue(editor, dataPath, datesArray, dataType);
          //_this.previousPreviewAnswers = window['previewAnswers'];
          _this.updatePreviewOptionsHtml();

          if (_this.previewAnswersValidation) {
            _this.previewAnswersValidation.categories[categoryIndex].questions[questionIndex].touched = true;
            _this.previewAnswersValidation = _this.getPreviewAnswersValidation();
          }

          _this.updatePreview();
        }

      }

      function datepickerRenderCellHandler(...args): any {
        let options = args.length == 1 || typeof args[0] == 'object' ? args[0] : { date: args[0], cellType: args[1], datepicker: args[2] };
        let { date, cellType, datepicker } = options;

        if (cellType == 'day') {
          let dateCellCustomData = _this.getDateCellCustomData.call(_this, { date, questionData, promotionData });
          return dateCellCustomData;
        }
      }

      /*end air-datepicker handlers*/

    }


    if (prewiewQuestion) {
      if (select) {
        let selectpickerInstance = new BootstrapSelectDirective({ nativeElement: select });
        selectpickerInstance.initSelectpicker(select);
        //$(select).selectpicker('toggle');
        //$(select).selectpicker('toggle');
      }

      this.setPreviewFormEventHandlers(prewiewQuestion, categoryIndex, questionIndex);

    }

  }

  getDateCellCustomData(options) {
    let { questionData, promotionData, date } = options || {};
    let obj: any = {};
    let datePattern = this.datePattern;
    let multipleDate = (() => {
      return questionData.dates == 'same' ?
        (() => {
          if (promotionData.promotionDate == 'specific') {
            return promotionData?.promotionDates?.staticDates?.dates || [];
          } else if (promotionData.promotionDate == 'recurring') {
            if (promotionData.endRecurrence == 'limited') {
              return getDates((moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d, (moment(promotionData.promotionDates.recurringDates.lastDate, datePattern) as any)._d).map(date => moment(date).format(datePattern));
            } else {
              return [(moment(promotionData.promotionDates.recurringDates.firstDates[0], datePattern) as any)._d].map(date => moment(date).format(datePattern));
            }
          } else {
            return [];
          }
        })()
        : Object.keys(questionData?.possibleDates?.staticDatesWithPricing?.dates || promotionData?.promotionDates?.staticDates?.dates || {})
    })();
    let blockedDates = promotionData?.blockedDates || {};
    let blockedDatesArray = (Object.keys(blockedDates) || []).filter(item => this.momentIsDate(item, datePattern));

    var multipleDates = multipleDate ? multipleDate.filter(item => this.momentIsDate(item, datePattern)).map(item => (moment(item, datePattern) as any)._d) : [];
    var disableOtherDates = questionData.disableOtherDates ? Object.keys(questionData?.possibleDates?.staticDatesWithPricing?.dates || promotionData?.promotionDates?.staticDates?.dates || {}).filter(item => this.momentIsDate(item, datePattern)).map(item => (moment(item, datePattern) as any)._d) : [];

    //if (questionData.dates == 'same') {
    if (multipleDates.length || disableOtherDates.length) {
      let enabledDays = promotionData?.promotionDates?.recurringDates?.enabledDays || getEnumValues(DayOfWeek) || [];
      var availableDates = (() => {

        let array = [...multipleDates, ...disableOtherDates];

        if (questionData.selectMultipleType == SelectionType[1] && questionData.selectMultiple) {
          array = array.sort((a, b) => a - b);
          array = getDates(array[0], array[array.length - 1]);
        }

        if (promotionData.promotionDate == 'recurring' && questionData.dates == 'same') {
          let recurrencePeriod = promotionData.promotionDates.recurringDates.recurrencePeriod;
          let recurrenceInterval = promotionData.promotionDates.recurringDates.recurrenceInterval;

          const RRule = this.rrule.RRule;
          let rule = new RRule((() => {
            let obj = {
              freq: [recurrencePeriod].map(freq => {
                switch (freq) {
                  case 'days':
                    return RRule.DAILY;
                  case 'weeks':
                    return RRule.WEEKLY;
                  case 'months':
                    return RRule.MONTHLY;
                  case 'years':
                    return RRule.YEARLY;
                }
              })[0],
              dtstart: array[0],
              count: promotionData.endRecurrence == 'limited' ? array.length : 42,
              interval: +recurrenceInterval
            };
            if (promotionData.endRecurrence == 'limited') {
              obj['until'] = array[array.length - 1];
            }
            return obj;
          })());

          array = rule.all();
        }

        return array;
      })();

      let fullyAvailableDates = availableDates;
      if (questionData?.tags?.isAttendanceDate && questionData?.tags?.addsToAttendeeCount) {
        fullyAvailableDates = availableDates.filter(date => !blockedDatesArray.includes(moment(date).format(datePattern)));
      }

      var isDisabled = (fullyAvailableDates.map(date => moment(date).format(datePattern)).indexOf(moment(date).format(datePattern)) == -1) || enabledDays.every(dayOfWeek => !this.momentIsSpecificDay(date, dayOfWeek));
      var isBlocked = blockedDatesArray.includes(moment(date).format(datePattern));
      var isAvailable = availableDates.map(date => moment(date).format(datePattern)).includes(moment(date).format(datePattern));

      obj['disabled'] = isDisabled;

      if (isAvailable && isBlocked && questionData?.tags?.isAttendanceDate && questionData?.tags?.addsToAttendeeCount) {
        obj['classes'] = '-blocked-';
        obj['attrs'] = {
          'data-tooltip': blockedDates?.[moment(date).format(datePattern)] || ''
        }
      }

    } else {
      obj['disabled'] = promotionData.promotionDate == 'noDate' ? false : true;
    }

    return obj;
    //}
  }

  setPreviewFormEventHandlers(prewiewQuestion, categoryIndex, questionIndex) {
    let inputs = [...prewiewQuestion.querySelectorAll('[data-path]:not(option), select')];
    inputs.forEach(input => {

      let onChangeHandler = (event) => {
        this.templatePending = true;
        var dataType = event.target.dataset.type || '';
        var dataPath = event.target.dataset.path || '';
        dataPath.split(',').forEach(dataPath => {
          dataPath = dataPath.trim();
          if (dataPath || event.target.localName == 'select') {
            let editor = this.editors[categoryIndex]?.questions[questionIndex]?.editor;

            let target = this.getParsedPath(editor, dataPath);

            if (target != undefined || event.target.localName == 'select') {

              if (event.target.localName == 'input') {
                if (["radio", "checkbox"].includes(event.target.type)) {
                  inputs.forEach(item => {
                    if (["radio", "checkbox"].includes(item.type) && item.name == event.target.name) {
                      var dataType = item.dataset.type || '';
                      var dataPath = item.dataset.path || '';
                      var dataAdditional = item.dataset.additional == 'true' ? true : false;
                      var checked = dataAdditional ? false : item.checked;

                      this.updateEditorValue(editor, dataPath, checked, dataType);

                      if (checked) {
                        item.setAttribute('checked', true);
                      } else {
                        item.removeAttribute('checked');
                      }
                      if (item == event.target) {
                        this.updatePreviewOptionsHtml();//*bugfix
                        this.updatePreviewForm(event, checked, dataPath, dataType)
                      }
                    }
                  })

                } else {
                  let value = event.target.value;
                  event.target.setAttribute('value', value);//*bugfix
                  this.updateEditorValue(editor, dataPath, value, dataType);
                  this.updatePreviewOptionsHtml();//*bugfix
                  this.updatePreviewForm(event, value, dataPath, dataType);
                }
              } else if (event.target.localName == 'select') {
                let selectedOptions = [...input.selectedOptions];
                [...input.options].forEach((option, i) => {
                  var dataType = option.dataset.type || '';
                  var dataPath = option.dataset.path || '';
                  var selected = selectedOptions.includes(option);
                  this.updateEditorValue(editor, dataPath, selected, dataType);
                  if (selected) {
                    option.setAttribute('selected', true);
                  } else {
                    option.removeAttribute('selected');
                  }
                  if (i == input.options.length - 1) {
                    this.updatePreviewOptionsHtml();//*bugfix
                    this.updatePreviewForm(event, selected, dataPath, dataType)
                  }
                })
              } else {
                let value = event.target.value;
                event.target.setAttribute('value', event.target.value);
                this.updateEditorValue(editor, dataPath, value, dataType);
              }


              //this.previousPreviewAnswers = window['previewAnswers'];
              console.log("JsonForm", this.editors, window['previewAnswers']);


            }
          }
        });
        this.previewAnswersValidation.categories[categoryIndex].questions[questionIndex].touched = true;
        this.previewAnswersValidation = this.getPreviewAnswersValidation();
      };

      input.onchange = input.onkeypress = input.onpaste = input.oncut = (event) => {
        onChangeHandler(event);
      }

      input.onfocus = (event) => {
        this.previewAnswersValidation.categories[categoryIndex].questions[questionIndex].touched = true;
        this.previewAnswersValidation = this.getPreviewAnswersValidation();
      };

    });
  }

  getPreviewFormTemplates(templateId?, onlyContent?) {
    onlyContent = onlyContent || false;
    let templates = `
    <template id="generalTemplate">
    [-label-][-testVar-]<input type="[-inputType-]" id="[-id-]">[-info-]: [-fn-]
    </template>
  
    <template id="categoryTemplate">
      <table id="category-[-categoryId-]" class="category [-className-]" border="0" cellpadding="0" cellspacing="0" style="width:100%">
        <thead>
          <tr class="[-showHeadingsClass-]">
            <td>
              <div class="title"><b>[-label-]</b></div>
              <div class="description">[-description-]</div>
            </td>
          </tr>
        </thead>
        <tbody class="model-editor">
        </tbody>
      </table>
    </template>
  
    <template id="emptyQuestion">
      <tr>
      </tr>
    </template>

    <template id="questionTemplate">
      <tr>
        <td style="padding-left:[-paddingLeft-];">
            <table id="question-[-id-]" class="question [-className-]" border="0" cellpadding="0" cellspacing="0" style="width: 100%;" class="options">
              <thead>
                <tr class="[-showHeadingsClass-]" >
                  <td colspan="[-colspan-]">
                    <div class="title"><b>[-label-]</b></div>
                    <div class="description">[-description-]</div>
                    [-notification-]
                  </td>
                </tr>
              </thead>
              <tbody>
                <template>
                  [-bodyTemplate-]
                </template>
              </tbody>
              <tfoot>
                <tr><th><b>[-taxesTitle-]</b></th></tr>
                <template>
                [-taxes-]
                </template>
              </tfoot>
            </table>
          </td>
        </tr>
    </template>

    <template id="multiChoiceBodyTemplate"></template>

    <template id="checkboxTemplate">
      <label class="glyphicon-checkbox glyphy">
        <input type="checkbox" name="[-name-]" value="[-value-]" [-checked-] [-required-] [-checkbox-validator-] data-path="[-data-path-]" data-type="[-data-type-]">
        <span class="label-text"></span>
      </label>
    </template>

    <template id="radioTemplate">
      
        <input type="radio" name="[-name-]" value="[-value-]" [-checked-] [-required-] [-checkbox-validator-] data-path="[-data-path-]" data-type="[-data-type-]">
     
    </template>

    <template id="numberTemplate">
      <input type="number" step="1" pattern="\\d*" name="[-name-]" min="[-minAttr-]" max="[-maxAttr-]" value="[-value-]" class="form-control text-end" [-required-] data-path="[-data-path-]" data-type="[-data-type-]">
    </template>

    <template id="lineTemplate">
      <tr class="counter-list [-classText-]">
        <td colspan="[-colspan-]" >
          <span class="key">
            <label class="form-group" style="display: flex; align-items: center;" title="[-description-]">
              [-input-][-number-][-title-]
            </label>
          </span>
          <span class="dots"></span>
          <span class="value">[-value-]</span>
        </td>
      </tr>
    </template>

    <template id="selectTemplate">
      <select name="[-name-]" class="form-control [-classText-]" [-multiple-] [-required-]>[-options-]</select>
    </template>

    <template id="optionTemplate">
    <!--<option value="None" data-cost="0.00" selected>None</option>-->
      <option value="[-value-]" 
      data-content="[-data-content-]"
      data-title="[-optionDescription-]" 
      data-cost="[-optionCost-]" 
      [-selected-]
      title="[-title-]"
      data-path="[-data-path-]" data-type="[-data-type-]"
      >
      [-text-]
      </option>
    </template>

    <template id="dropdownContentTemplate">
      <div class="dropdown-content">[-number-]<span>[-title-]</span></div>
    </template>

    <template id="dateQuestionBodyTemplate">
      <tr style="display:flex">
        <td valign="top" style="white-space: nowrap; padding: 0; padding-right: 20px;">
          <p>
            <input type="text" class="dateInput inline-calendar form-control icon-right [-multiple-] [-dateRange-]" [-required-] data-min-days="[-data-min-days-]" data-max-days="[-data-max-days-]" data-start-date-picker="[-data-start-date-picker-]" data-end-date-picker="[-data-end-date-picker-]">
          </p>
          <p class="notification [-datesNotificationClass-]" style="width: 220px;">
              Some dates have been disabled as the attendee limit has already been reached
          </p>
          <p style="margin-top: 0.5em">
            <button style="font-size: 0.8em;" class="btn btn-xs btn-primary clear-dates">Clear Dates</button>
          </p>
        </td>
        <td valign="top" style="white-space: nowrap; padding: 0; width:100%;">
          <p class="dates-title"><b>[-datesTitle-]</b></p>
          <table class="selected-dates" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tbody>
              <template>[-selectedDates-]</template>
            </tbody>
          </table>
        </td>
      </tr>
    </template>

    <template id="shortTextQuestionTemplate">
      <tr>
        <td style="padding-left:[-paddingLeft-];">
          <table id="question-[-id-]" class="question [-className-]" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tbody>
              <tr class="line">
                <td style="width:180px; padding:0px;" class="[-showHeadingsClass-]">
                  <div><b class="title">[-label-]:</b></div>
                </td>
                <td style="padding:0px;">
                  <span class="form-group">
                    <input type="[-inputType-]" class="form-control" name="[-name-]" value="[-value-]" pattern="[-validation-]" [-required-] title="[-title-]" placeholder="[-placeholder-]" autocomplete="on"  data-path="[-data-path-]" data-type="[-data-type-]">
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
            </tfoot>
          </table>
        </td>
      </tr>
    </template>

    <template id="valueBodyTemplate">
      <tr class="counter-list price line">
        <td>
          <span class="key">
            <label title="[-description-]" class="form-group">
              <span>[-currency-]</span>
              [-number-]
            </label>
          </span>
          <span class="value">[-value-]</span>
        </td>
      </tr>
    </template>

    <template id="longTextQuestionBodyTemplate">
      <tr class="line">
        <td>
          <span class="form-group">
            <textarea class="form-control" name="[-name-]" cols="50" rows="5" [-required-] data-path="[-data-path-]" data-type="[-data-type-]">[-value-]</textarea>
          </span>
        </td>
      </tr>
    </template>
    `

    var div = document.createElement('div');
    div.innerHTML = templates.trim();

    if (templateId) {
      let el = div.querySelector('#' + templateId);
      let content = el.innerHTML.replace(/<template>|<\/template>/gim, '');
      let template = onlyContent ? content : `<template id="${templateId}">` + content + `</template>`;
      return template;
    } else {
      return templates;
    }


  }

  getRequiredPreviewData(previewAnswers, categoryId, questionId) {
    let category = previewAnswers?.categories.filter(category => category.id == categoryId || category.tempId == categoryId)[0];
    let requiredСategoryIndex = previewAnswers?.categories?.map(item => item.id || item.tempId)?.indexOf(categoryId);
    let requiredСategory = previewAnswers?.categories?.[requiredСategoryIndex];

    let question = category.questions.filter(question => question.id == questionId || question.tempId == questionId)[0];
    let requiredQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(questionId);
    let requiredQuestion = requiredСategory?.questions?.[requiredQuestionIndex];

    return {
      categoryIndex: requiredСategoryIndex,
      category: requiredСategory,
      questionIndex: requiredQuestionIndex,
      question: requiredQuestion,
    }
  }

  getPreviewAnswers(previousPreviewAnswers?) {
    previousPreviewAnswers = previousPreviewAnswers || Object.assign({}, window['previewAnswers']);
    let totalCost = 0;
    let promotionData = this.promotionData;
    let data = {
      categories: promotionData.categories.map((category, categoryIndex) => {
        let categoryIdKey = category?.id ? 'id' : 'tempId';
        let categoryIdValue = category?.id ? category?.id : category?.tempId;
        let requiredСategoryIndex = previousPreviewAnswers?.categories?.map(item => item.id || item.tempId)?.indexOf(categoryIdValue);
        let requiredСategory = previousPreviewAnswers?.categories?.[requiredСategoryIndex];
        return {
          [categoryIdKey]: categoryIdValue,
          title: category['name'],
          questions: category.questions.map((question, questionIndex) => {
            let questionType = Object.keys(question)[0];
            let questionData = question[questionType];
            let questionIdKey = questionData?.id ? 'id' : 'tempId';
            let questionIdValue = questionData?.id ? questionData?.id : questionData?.tempId;
            let requiredQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(questionIdValue);
            let requiredQuestion = requiredСategory?.questions?.[requiredQuestionIndex];


            let obj = {
              [questionIdKey]: questionIdValue,
              title: questionData['title'],
            };
            let isDisplayed = this.displayPreviewQuestion(categoryIndex, questionIndex);

            let datePattern = this.datePattern;

            const getRequiredQuestionDates = (question, requiredQuestionDates) => {
              let totalCost = 0;
              let questionType = Object.keys(question)[0];
              let questionData = question[questionType];
              let questionId = (questionData.id || questionData.tempId);
              return requiredQuestionDates?.reduce((prev, dateObj, i, datesArr) => {

                let date = (moment(dateObj.date, datePattern) as any)._d;
                let dateCellCustomData = this.getDateCellCustomData({ date, questionData, promotionData });

                if (dateCellCustomData.disabled) {
                  return prev;
                }

                let basePriceValue = this.getBasePriceValue(question, date);

                let controlQuestionsPrice = (() => { // display - never
                  let price = 0;
                  for (let controlQuestion of category.questions) {
                    let controlQuestionType = Object.keys(controlQuestion)[0];
                    let controlQuestionId = (controlQuestion[controlQuestionType].id || controlQuestion[controlQuestionType].tempId);

                    if (controlQuestion[controlQuestionType].sameValueAs == questionId) {
                      //let requiredControlQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(controlQuestionId);
                      //let requiredControlQuestion = requiredСategory?.questions?.[requiredControlQuestionIndex ];
                      price = getRequiredQuestionDates(controlQuestion, datesArr)[i].totalCost;
                      break;
                    }
                  }
                  return price;
                })();

                let dateCost = (() => {
                  let cost = ((questionData?.possibleDates?.staticDatesWithPricing?.dates?.[dateObj.date] || 0) + basePriceValue);
                  let sameDate = datesArr?.[i - 1]?.date == datesArr[i].date;

                  if (questionData.pricingMethod == "perDay") {
                    if (sameDate) {
                      return 0
                    } else {
                      return cost;
                    }
                  } else if (questionData.pricingMethod == "perNight") {
                    if ((i != datesArr.length - 1) || (datesArr.length == 1)) {
                      return cost;
                    } else {
                      return 0;
                    }
                  } else if (questionData.pricingMethod == "dontApply") {
                    return 0;
                  }

                  // if (sameDate) {
                  //   return 0
                  // } else {
                  //   return cost;
                  // }
                })();

                let min = questionData?.buyMultiple?.minimum != undefined ? questionData?.buyMultiple?.minimum : 1;
                let max = questionData?.buyMultiple?.maximum != undefined && questionData?.buyMultiple?.maximum != 0 ? questionData?.buyMultiple?.maximum : 0;
                let quantityValue = (dateObj.quantity || 1);
                let quantity = quantityValue; // < min ? min : quantityValue > max ? max != 0 ? max : quantityValue || min : quantityValue || min;

                totalCost += isDisplayed ? (dateCost + controlQuestionsPrice) * (dateObj.quantity || 1) : 0;

                prev.push({
                  date: dateObj.date || '',
                  quantity: quantity,
                  cost: isDisplayed ? dateCost + controlQuestionsPrice : 0,
                  totalCost: isDisplayed ? (dateCost + controlQuestionsPrice) * quantity : 0
                })

                return prev;

              }, []) || [];
            }

            switch (questionType) {
              case QuestionTypes[0]: {
                let hasAdditionalOption = (!questionData.mandatory && !questionData.selectMultiple);

                obj['options'] = questionData.options.map((option, optionIndex) => {
                  let optionIdKey = option?.id ? 'id' : 'tempId'
                  let optionIdValue = option?.id ? option?.id : option?.tempId;
                  let isInitialized = !!this.previousPreviewAnswers?.categories?.[categoryIndex]?.questions?.[questionIndex]?.options?.[optionIndex];
                  let selected = requiredQuestion?.options?.some(item => item.selected) ? requiredQuestion?.options?.[optionIndex]?.selected : hasAdditionalOption ? false : (optionIndex == 0 && (!questionData.selectMultiple && !isInitialized || questionData.mandatory) ? true : false);//? questionData.mandatory

                  let dependentDatesCost = 0;
                  let dependentDatesQuantity = (() => { // pricing - perDate
                    let quantity = 0;
                    let requiredDependentQuestionType = questionData.pricingDependsOn ? Object.keys(questionData.pricingDependsOn)[0] : null;
                    if (requiredDependentQuestionType) {
                      let requiredDependentQuestionId = questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.id || questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.tempId;
                      let requiredDependentQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(requiredDependentQuestionId);
                      let requiredDependentQuestion = requiredСategory?.questions?.[requiredDependentQuestionIndex];
                      let dates = uniqueArr(requiredDependentQuestion?.dates || [], 'date');
                      if (dates?.length) {
                        quantity = questionData.pricingDependencyMethod == "perNight" ? dates?.length - 1 : dates?.length;
                      }
                      if (questionData.pricing == "perDate") {
                        if (questionData.optionCostsFixed == false) {
                          if (questionData.pricingDependencyMethod == "perNight") dates = dates?.length > 1 ? dates.slice(1) : dates;
                          dependentDatesCost = getRequiredQuestionDates(category.questions[requiredDependentQuestionIndex], dates).reduce((prev, cur) => prev + cur?.totalCost || 0, 0);
                        }
                      }
                    }
                    return quantity;
                  })();

                  let dependentOptionsQuantity = (() => { // pricing - perQuantity
                    let quantity = 0;
                    let requiredDependentQuestionType = questionData.pricingDependsOn ? Object.keys(questionData.pricingDependsOn)[0] : null;
                    if (requiredDependentQuestionType) {
                      let requiredDependentQuestionId = questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.id || questionData?.pricingDependsOn?.[requiredDependentQuestionType]?.tempId;
                      let requiredDependentQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(requiredDependentQuestionId);
                      let requiredDependentQuestion = requiredСategory?.questions?.[requiredDependentQuestionIndex];
                      let optionsLength = requiredDependentQuestion?.options?.filter(item => item.selected).length;
                      if (optionsLength) {
                        quantity = optionsLength;
                      }
                    }
                    return quantity;
                  })();


                  let min = questionData?.buyMultiple?.minimum != undefined ? questionData?.buyMultiple?.minimum : 1;
                  let max = questionData?.buyMultiple?.maximum != undefined && questionData?.buyMultiple?.maximum != 0 ? questionData?.buyMultiple?.maximum : 0;
                  let quantityValue = (requiredQuestion?.options?.[optionIndex]?.quantity || 1);
                  let quantity = quantityValue;// < min ? min : quantityValue > max ? max != 0 ? max : quantityValue || min : quantityValue || min;

                  let optionTotalCost = (((option?.cost) * (questionData.pricing != "asIs" ? dependentDatesQuantity + dependentOptionsQuantity : 1)) * quantity) + dependentDatesCost || 0;

                  totalCost += selected && isDisplayed ? optionTotalCost : 0;

                  return {
                    [optionIdKey]: optionIdValue,
                    title: option?.title,
                    cost: isDisplayed ? ((option?.cost) * (questionData.pricing != "asIs" ? dependentDatesQuantity + dependentOptionsQuantity : 1)) + (dependentDatesCost / quantity) || 0 : 0,
                    quantity: quantity,
                    selected: selected,
                    totalCost: selected && isDisplayed ? optionTotalCost : 0,
                  }
                })

                if (questionData?.taxes) {
                  obj['taxes'] = questionData.taxes.map((tax, taxIndex) => {
                    let taxIdKey = tax?.id ? 'id' : 'tempId'
                    let taxIdValue = tax?.id ? tax?.id : tax?.tempId;

                    let taxTotalCost = this.getTaxValue(
                      tax.tax.taxType,
                      obj['options']?.reduce((prev, cur) => cur.selected ? prev + cur.totalCost : prev + 0, 0) || 0,
                      obj['options']?.reduce((prev, cur) => cur.selected ? prev + cur.quantity : prev + 0, 0) || 0,
                      obj['options']?.length && obj['options'].some(item => item.selected) ? tax.amount : 0,
                    )

                    totalCost += isDisplayed ? taxTotalCost : 0;

                    return {
                      [taxIdKey]: taxIdValue,
                      title: tax?.tax?.name,
                      cost: isDisplayed ? taxTotalCost : 0
                    }
                  })
                }

                break;
              }
              case QuestionTypes[1]: {
                obj['dates'] = getRequiredQuestionDates(question, requiredQuestion?.dates);
                let datesCosts = obj['dates'].reduce((prev, cur) => prev + cur.totalCost, 0);
                totalCost += datesCosts;
                if (questionData?.taxes) {
                  obj['taxes'] = questionData.taxes.map((tax, taxIndex) => {
                    let taxIdKey = tax?.id ? 'id' : 'tempId'
                    let taxIdValue = tax?.id ? tax?.id : tax?.tempId;

                    let taxTotalCost = this.getTaxValue(
                      tax.tax.taxType,
                      datesCosts,
                      obj['dates']?.reduce((prev, cur) => (prev + cur.quantity) || 0, 0) || 0,
                      obj['dates']?.length ? tax.amount : 0
                    );

                    totalCost += isDisplayed ? taxTotalCost : 0;

                    return {
                      [taxIdKey]: taxIdValue,
                      title: tax?.tax?.name,
                      cost: isDisplayed ? taxTotalCost : 0
                    }
                  })
                }

                break;
              }
              case QuestionTypes[2]: {
                if (questionData['contentType'] == ContentType[3]) {
                  let min = questionData.valueLimits.minimum != undefined ? questionData.valueLimits.minimum : 0;
                  let max = questionData.valueLimits.maximum != undefined && questionData.valueLimits.maximum != 0 ? questionData.valueLimits.maximum : 0;
                  let value = Number(requiredQuestion?.shortText) || Number(requiredQuestion?.longText) || questionData?.valueLimits?.minimum || 0;
                  obj['shortText'] = value < min ? min : value > max ? max != 0 ? max : value || min : value || min;
                  totalCost += isDisplayed ? obj['shortText'] : 0;
                } else {
                  obj['shortText'] = requiredQuestion?.shortText || requiredQuestion?.longText || '';
                }

                break;
              }
              case QuestionTypes[3]: {
                obj['longText'] = requiredQuestion?.longText || requiredQuestion?.shortText || '';
                break;
              }
            }

            return obj;

          })
        }
      })
    }

    data["totalCost"] = totalCost;

    if (this.promotionData?.hasTaxes) {
      data['taxes'] = this.promotionData.taxes.map((tax, taxIndex) => {
        let taxIdKey = tax?.id ? 'id' : 'tempId'
        let taxIdValue = tax?.id ? tax?.id : tax?.tempId;

        let taxTotalCost = this.getTaxValue(
          tax.tax.taxType,
          data['totalCost'],
          0, //only for per unit/purchase
          tax.amount || 0
        )

        totalCost += taxTotalCost || 0;

        return {
          [taxIdKey]: taxIdValue,
          title: tax?.tax?.name,
          cost: taxTotalCost || 0
        }
      })
    }

    data["totalCost"] = totalCost;

    return data;
  }

  getPreviewAnswersValidation() {
    let data = {
      categories: (() => {
        let categories = this.promotionData.categories.map((category, categoryIndex) => {
          let categoryIdKey = category?.id ? 'id' : 'tempId';
          let categoryIdValue = category?.id ? category?.id : category?.tempId;
          let requiredСategoryIndex = window['previewAnswers']?.categories?.map(item => item.id || item.tempId)?.indexOf(categoryIdValue);
          let requiredСategory = window['previewAnswers']?.categories?.[requiredСategoryIndex];
          let categoryValidation = this.previewAnswersValidation?.categories?.[requiredСategoryIndex];
          let categoryData = {
            [categoryIdKey]: categoryIdValue,
            title: category['name'],
            touched: !!requiredСategory?.touched || false,
            valid: !!requiredСategory?.valid || false,
            questions: (() => {
              let questions = category.questions.map((question, questionIndex) => {
                let questionType = Object.keys(question)[0];
                let questionData = question[questionType];
                let questionIdKey = questionData?.id ? 'id' : 'tempId';
                let questionIdValue = questionData?.id ? questionData?.id : questionData?.tempId;
                let requiredQuestionIndex = requiredСategory?.questions?.map(item => item.id || item.tempId)?.indexOf(questionIdValue);
                let requiredQuestion = requiredСategory?.questions?.[requiredQuestionIndex];
                let questionValidation = categoryValidation?.questions?.[requiredQuestionIndex];
                let questionMandatory = question?.[questionType]?.mandatory || false;
                let isDisplayed = this.displayPreviewQuestion(categoryIndex, questionIndex);

                let valid = (() => {
                  let isValid = true;
                  switch (questionType) {
                    case QuestionTypes[0]: {
                      let someSelected = false;
                      let totalQuantity = requiredQuestion?.['options'].reduce((prev, cur) => {
                        if (cur.selected) someSelected = true;
                        return prev + (cur.selected ? cur.quantity || 1 : 0);
                      }, 0);
                      isValid = requiredQuestion?.['options'].some(item => {
                        let min = questionData?.buyMultiple?.minimum != undefined ? questionData?.buyMultiple?.minimum : 1;
                        let max = questionData?.buyMultiple?.maximum != undefined && questionData?.buyMultiple?.maximum != 0 ? questionData?.buyMultiple?.maximum : 0;
                        let quantityValue = item.quantity || 1;
                        let quantity = quantityValue;//quantityValue < min ? min : quantityValue > max ? max != 0 ? max : quantityValue || min : quantityValue || min;

                        return questionMandatory && isDisplayed ? (item.selected && totalQuantity >= min && (max ? totalQuantity <= max : true)) : (someSelected ? (max ? totalQuantity <= max : true) && totalQuantity >= min : true);
                      }) ? true : false;
                      break;
                    }
                    case QuestionTypes[1]: {
                      if (questionMandatory && isDisplayed) {
                        isValid = requiredQuestion?.['dates']?.length ? true : false;
                      }
                      break;
                    }
                    case QuestionTypes[2]: {
                      let value = (requiredQuestion?.['shortText']?.toString())?.trim() || '';
                      if ([ContentType[0], ContentType[3]].includes(questionData['contentType']) && questionData?.validationRegex) {
                        let parsedValidationRegex = parseRegExpString(questionData.validationRegex);
                        let validRegExp = (parsedValidationRegex?.length ? new RegExp(parsedValidationRegex?.[1] || '', parsedValidationRegex?.[2] || '') : new RegExp(questionData.validationRegex)).test((requiredQuestion?.['shortText'].toString())?.trim())
                        isValid = questionMandatory && isDisplayed ? !!value && validRegExp : !!value ? validRegExp : true;
                      } else if (questionData['contentType'] == ContentType[2]) {
                        let validPhoneNumber = !PhoneValidators.validPhoneNumber({ value })?.validPhoneNumber;
                        isValid = questionMandatory && isDisplayed ? !!value && validPhoneNumber : !!value ? validPhoneNumber : true;
                      } else if (questionData['contentType'] == ContentType[1]) {
                        let validEmail = !EmailValidators.validEmail({ value })?.validEmail;
                        isValid = questionMandatory && isDisplayed ? !!value && validEmail : !!value ? validEmail : true;
                      } else {
                        isValid = questionMandatory && isDisplayed ? !!value : true;
                      }
                      break;
                    }
                    case QuestionTypes[3]: {
                      if (questionMandatory && isDisplayed) {
                        isValid = !!requiredQuestion?.['longText']?.trim();
                      }
                      break;
                    }
                  }
                  return isValid;
                })();

                return {
                  [questionIdKey]: questionIdValue,
                  title: questionData['title'],
                  touched: !!questionValidation?.touched || false,
                  disabled: !this.displayPreviewQuestion(categoryIndex, questionIndex),
                  valid: valid || false,
                }
              });

              return questions;

            })()
          }

          categoryData['touched'] = !!categoryData?.questions?.some(item => item.touched);
          categoryData['disabled'] = !!!categoryData?.questions?.every(item => item.disabled);
          categoryData['valid'] = !!categoryData?.questions?.every(item => item.valid);

          return categoryData;
        });


        return categories;

      })()
    }

    data['touched'] = !!data?.categories?.some(item => item.touched);
    data['disabled'] = !!!data?.categories?.every(item => item.disabled);
    data['valid'] = !!data?.categories?.every(item => item.valid);

    return data;

  }

  public validationTouchAll() {
    this.previewAnswersValidation?.categories?.forEach(categoryValidation => {
      categoryValidation?.questions?.forEach(questionValidation => {
        questionValidation.touched = true;
      });
    });
    this.previewAnswersValidation = this.getPreviewAnswersValidation();
  }

  momentIsDate(date, format) {
    return ((moment(date) as any)._d != 'Invalid Date') && (format ? (moment(date) as any)._f == format : true);
  }

  momentIsSpecificDay(date, dayName) {
    const daysOfWeek = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    const momentDate = moment(date);
    const dayIndex = momentDate.day();
    return dayIndex === daysOfWeek[dayName.toLowerCase()];
  }

}


