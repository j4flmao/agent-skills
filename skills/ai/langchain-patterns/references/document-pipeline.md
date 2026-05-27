# Document Pipeline

## Overview

Document pipelines transform raw files into searchable, processable content for RAG systems. This reference covers document loaders, text splitters, metadata extraction, document transformers, and pipeline orchestration for production document processing.

## Document Loaders

### File Loaders

```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVDocumentLoader,
    UnstructuredMarkdownLoader,
    JSONLoader,
    DirectoryLoader,
)
from langchain_core.documents import Document
from typing import List, Optional

class DocumentLoaderFactory:
    LOADERS = {
        ".pdf": PyPDFLoader,
        ".txt": TextLoader,
        ".md": UnstructuredMarkdownLoader,
        ".csv": CSVDocumentLoader,
        ".json": JSONLoader,
    }

    def create_loader(self, file_path: str, **kwargs) -> Optional:
        import os
        ext = os.path.splitext(file_path)[1].lower()
        loader_cls = self.LOADERS.get(ext)
        if loader_cls:
            return loader_cls(file_path, **kwargs)
        return TextLoader(file_path, **kwargs)

class BatchDocumentLoader:
    def __init__(self, paths: List[str], loader_factory: DocumentLoaderFactory):
        self.paths = paths
        self.factory = loader_factory

    def load_all(self) -> List[Document]:
        documents = []
        for path in self.paths:
            loader = self.factory.create_loader(path)
            if loader:
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source"] = path
                documents.extend(docs)
        return documents

    def load_from_directory(self, directory: str, glob_pattern: str = "**/*") -> List[Document]:
        loader = DirectoryLoader(
            directory,
            glob=glob_pattern,
            loader_cls=PyPDFLoader,
            show_progress=True,
        )
        return loader.load()
```

### Web Loaders

```python
from langchain_community.document_loaders import (
    WebBaseLoader,
    SitemapLoader,
    AsyncHtmlLoader,
    RecursiveUrlLoader,
)

class WebDocumentLoader:
    def load_url(self, url: str) -> List[Document]:
        loader = WebBaseLoader(url)
        docs = loader.load()
        for doc in docs:
            doc.metadata["source"] = url
        return docs

    def load_sitemap(self, sitemap_url: str) -> List[Document]:
        loader = SitemapLoader(sitemap_url)
        return loader.load()

    async def load_multiple(self, urls: List[str]) -> List[Document]:
        loader = AsyncHtmlLoader(urls)
        docs = await loader.load()
        return docs
```

## Text Splitters

### Recursive Character Splitter

```python
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    TokenTextSplitter,
    SentenceTransformersTokenTextSplitter,
    MarkdownHeaderTextSplitter,
    PythonCodeTextSplitter,
)
from langchain_core.documents import Document

def create_recursive_splitter(
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    separators: List[str] = None,
) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators or ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
        length_function=len,
    )

def split_documents(documents: List[Document], splitter) -> List[Document]:
    return splitter.split_documents(documents)

class SmartSplitter:
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.splitters = {
            "markdown": self._create_markdown_splitter(),
            "code": self._create_code_splitter(),
            "text": self._create_text_splitter(),
        }

    def _create_markdown_splitter(self):
        return MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "Header 1"),
                ("##", "Header 2"),
                ("###", "Header 3"),
            ]
        )

    def _create_code_splitter(self):
        return PythonCodeSplitter()

    def _create_text_splitter(self):
        return RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
        )

    def split(self, document: Document) -> List[Document]:
        import os
        source = document.metadata.get("source", "")
        ext = os.path.splitext(source)[1].lower()
        if ext == ".md":
            return self.splitters["markdown"].split_text(document.page_content)
        elif ext == ".py":
            return self.splitters["code"].split_text(document.page_content)
        else:
            return self.splitters["text"].split_documents([document])
```

### Semantic Chunker

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

class SemanticSplitter:
    def __init__(self, embeddings_model: str = "text-embedding-3-small"):
        self.splitter = SemanticChunker(
            OpenAIEmbeddings(model=embeddings_model),
            breakpoint_threshold_type="percentile",
            breakpoint_threshold_amount=0.3,
        )

    def split(self, text: str) -> List[str]:
        return self.splitter.split_text(text)

    def split_documents(self, documents: List[Document]) -> List[Document]:
        return self.splitter.split_documents(documents)
```

## Document Transformers

### Metadata Extraction

```python
from langchain_core.documents import Document
from typing import Dict, Any

class MetadataExtractor:
    def extract(self, document: Document) -> Dict[str, Any]:
        metadata = {}
        metadata["char_count"] = len(document.page_content)
        metadata["word_count"] = len(document.page_content.split())
        metadata["source"] = document.metadata.get("source", "unknown")
        metadata["file_type"] = self._detect_file_type(metadata["source"])
        metadata["language"] = self._detect_language(document.page_content)
        return metadata

    def _detect_file_type(self, source: str) -> str:
        import os
        ext = os.path.splitext(source)[1].lower()
        type_map = {
            ".pdf": "pdf", ".txt": "text", ".md": "markdown",
            ".csv": "csv", ".json": "json", ".html": "html",
            ".py": "code", ".js": "code", ".ts": "code",
        }
        return type_map.get(ext, "unknown")

    def _detect_language(self, text: str) -> str:
        if len(text) < 20:
            return "unknown"
        import re
        non_ascii = len(re.findall(r'[^\x00-\x7F]', text))
        ratio = non_ascii / max(len(text), 1)
        if ratio > 0.5:
            return "non-english"
        return "english"
```

## Pipeline Orchestration

### Document Processing Pipeline

```python
from typing import Callable, List

class DocumentPipeline:
    def __init__(self, stages: List[Callable] = None):
        self.stages = stages or []

    def add_stage(self, stage: Callable):
        self.stages.append(stage)

    def process(self, documents: List[Document]) -> List[Document]:
        result = documents
        for stage in self.stages:
            result = stage(result)
        return result

    async def process_async(self, documents: List[Document]) -> List[Document]:
        import asyncio
        result = documents
        for stage in self.stages:
            if asyncio.iscoroutinefunction(stage):
                result = await stage(result)
            else:
                result = stage(result)
        return result


class DocumentPipelineBuilder:
    def __init__(self):
        self.pipeline = DocumentPipeline()

    def with_loaders(self, loader) -> "DocumentPipelineBuilder":
        def load(docs):
            return loader.load_all()
        return self

    def with_splitter(self, splitter) -> "DocumentPipelineBuilder":
        def split(docs):
            return splitter.split_documents(docs)
        self.pipeline.add_stage(split)
        return self

    def with_metadata_extraction(self, extractor: MetadataExtractor) -> "DocumentPipelineBuilder":
        def extract(docs):
            for doc in docs:
                doc.metadata.update(extractor.extract(doc))
            return docs
        self.pipeline.add_stage(extract)
        return self

    def build(self) -> DocumentPipeline:
        return self.pipeline
```

## Key Points

- Use appropriate loaders for each file type (PyPDF for PDFs, TextLoader for plain text).
- Batch load documents from directories using DirectoryLoader with glob patterns.
- RecursiveCharacterTextSplitter is the default splitter for most text types.
- Semantic chunker improves retrieval by splitting at topic boundaries.
- Use MarkdownHeaderTextSplitter for structured documents to preserve hierarchy.
- Set chunk overlap to at least 10% of chunk size for boundary context preservation.
- Extract and store metadata (character count, source, file type, language).
- Use document transformers for cleaning, deduplication, and enrichment.
- Chain processing stages into a pipeline for reproducible document processing.
- Track document lineage from source file to chunks for provenance.
- Process large document sets in parallel batches with progress tracking.
- Validate chunk quality by checking for truncated sentences or broken code.
- Handle encoding errors gracefully with fallback encodings.
- Generate chunk IDs for deduplication and reference tracking.
- Store chunk index positions for original document reconstruction.
- Test splitter parameters on representative samples before full processing.
- Version document processing pipelines alongside embedding indexes.
