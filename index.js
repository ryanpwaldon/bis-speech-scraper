import axios from 'axios'
import jsdom from 'jsdom'
import fs from 'fs'
const { JSDOM } = jsdom
import {
  BIS_BASE_URL,
  BIS_INSTITUTIONS_JSON_PATH,
  BIS_SPEECHES_JSON_PATH,
  BIS_SPEECHES_HTML_PATH,
  PAGE_SIZE,
  DATE_FROM,
  SORT,
  THEME
} from './constants.js'

const client = axios.create({
  baseURL: BIS_BASE_URL
})

const getInstitutions = async () => {
  return (await client({
    method: 'GET',
    url: BIS_INSTITUTIONS_JSON_PATH
  })).data
}

const getSpeechesByInstitution = async institution => {
  console.log('================')
  console.log(institution.name.trim())
  console.log('================')
  let currentPage = 1
  const getParams = () => ({
    theme: THEME,
    from: DATE_FROM,
    sort_list: SORT,
    paging_length: PAGE_SIZE,
    institutions: institution.id,
    page: currentPage
  })
  const totalPages = await (async () => {
    const html = (await client({
      method: 'GET',
      url: BIS_SPEECHES_HTML_PATH,
      params: getParams()
    })).data
    const document = (new JSDOM(html)).window.document
    const totalPagesEl = document.querySelector('.pageof span')
    return (totalPagesEl && totalPagesEl.textContent.split(' of ')[1]) || 1
  })()
  console.log('Total pages: ' + totalPages)
  const speechesForInstitution = []
  while (currentPage <= totalPages) {
    const rawSpeeches = (await client({
      method: 'GET',
      url: BIS_SPEECHES_JSON_PATH,
      params: getParams()
    })).data
    speechesForInstitution.push(...rawSpeeches.map(rawSpeech => ({
      language: rawSpeech.language,
      institution: institution.name.trim(),
      institutionId: institution.id,
      date: rawSpeech.publicationStartDate,
      url: `${BIS_BASE_URL}${rawSpeech.path}`,
      authors: rawSpeech.authors.map(author => author.nameAsWritten)
    })))
    console.log('Page complete: ' + currentPage)
    currentPage++
  }
  console.log('Total parsed: ' + speechesForInstitution.length)
  console.log('End: ' + institution.name)
  return speechesForInstitution
}

const getAllSpeeches = async () => {
  let currentPage = 1
  const getParams = () => ({
    theme: THEME,
    from: DATE_FROM,
    sort_list: SORT,
    paging_length: PAGE_SIZE,
    page: currentPage
  })
  const totalPages = await (async () => {
    const html = (await client({
      method: 'GET',
      url: BIS_SPEECHES_HTML_PATH,
      params: getParams()
    })).data
    const document = (new JSDOM(html)).window.document
    const totalPagesEl = document.querySelector('.pageof span')
    return (totalPagesEl && totalPagesEl.textContent.split(' of ')[1]) || 1
  })()
  console.log('Total pages: ' + totalPages)
  const speeches = []
  while (currentPage <= totalPages) {
    const rawSpeeches = (await client({
      method: 'GET',
      url: BIS_SPEECHES_JSON_PATH,
      params: getParams()
    })).data
    speeches.push(...rawSpeeches.map(rawSpeech => ({
      language: rawSpeech.language,
      date: rawSpeech.publicationStartDate,
      url: `${BIS_BASE_URL}${rawSpeech.path}`,
      authors: rawSpeech.authors.map(author => author.nameAsWritten)
    })))
    console.log('Page complete: ' + currentPage)
    currentPage++
  }
  console.log('Total parsed: ' + speeches.length)
  return speeches
}

(async () => {
  const speeches = await getAllSpeeches()
  fs.writeFile('speeches.json', JSON.stringify(speeches), () => console.log('Complete'))
})()

(async () => {
  const speeches = []
  const institutions = await getInstitutions()
  for (const institution of institutions) speeches.push(...(await getSpeechesByInstitution(institution)))
  fs.writeFile('speeches.json', JSON.stringify(speeches), () => console.log('Complete'))
})()
