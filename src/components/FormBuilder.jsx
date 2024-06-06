import React, { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { FormBuilder as FormioFormBuilder } from '@arun-s-aot/formiojs/lib';

const FormBuilder = (props) => {
	const { options = {}, Builder = FormioFormBuilder, form } = props;
	const builderRef = useRef();
	let element;

	const emit =
		(funcName) =>
		(...args) => {
			// eslint-disable-next-line no-prototype-builtins
			if (
				props.hasOwnProperty(funcName) &&
				typeof props[funcName] === 'function'
			) {
				props[funcName](...args);
			}
		};

	const onChange = () => {
		const { onChange } = props;
		if (onChange && typeof onChange === 'function') {
			builderRef.current.instance.form.components =
				iterateConditionsAndSetLogic(
					builderRef.current.instance.form.components
				);
			// console.log('updated components -->',builderRef.current.instance.form.components);
			const schema = {
				...builderRef.current.instance.form,
			};

			Object.defineProperty(schema, 'components', {
				get: function () {
					return builderRef.current.instance.schema.components;
				},
			});

			onChange(builderRef.current.instance.form, schema);
		}
	};

	const builderEvents = [
		{
			name: 'saveComponent',
			action: (component, original, parent, path, index, isNew) => {
				emit('onSaveComponent')({
					component,
					original,
					parent,
					path,
					index,
					isNew,
				});
			},
		},
		{ name: 'updateComponent', action: emit('onUpdateComponent') },
		{ name: 'removeComponent', action: emit('onDeleteComponent') },
		{ name: 'cancelComponent', action: emit('onUpdateComponent') },
		{ name: 'editComponent', action: emit('onEditComponent') },
		{ name: 'addComponent', action: onChange },
		{ name: 'saveComponent', action: onChange },
		{ name: 'updateComponent', action: onChange },
		{
			name: 'removeComponent',
			action: (component, parent, path, index) => {
				emit('onDeleteComponent')({ component, parent, path, index });
			},
		},
		{ name: 'deleteComponent', action: onChange },
		{ name: 'pdfUploaded', action: onChange },
	];

	const initializeBuilder = (builderProps) => {
		let { options, form } = builderProps;
		const { Builder } = builderProps;
		options = Object.assign({}, options);
		form = Object.assign({}, form);

		builderRef.current = new Builder(element, form, options);

		builderRef.current.ready.then(() => {
			onChange();
			builderEvents.forEach(({ name, action }) => {
				builderRef.current.instance.off(name, action);
				builderRef.current.instance.on(name, action);
			});
		});
	};

	useEffect(() => {
		initializeBuilder({ options, Builder, form });
		return () =>
			builderRef.current
				? builderRef.current.instance.destroy(true)
				: null;
	}, [builderRef]);

	useEffect(() => {
		if (!builderRef.current && form) {
			initializeBuilder({ options, Builder, form });
		}
	}, [form, builderRef]);

	const elementDidMount = useCallback((el) => (element = el));

	useLayoutEffect(() => {
		if (builderRef.current && form && form.display) {
			builderRef.current.setDisplay(form.display);
		}
	}, [form.display]);

	useLayoutEffect(() => {
		if (builderRef.current && form && form.components) {
			builderRef.current.setForm(form);
		}
	}, [form]);

	function iterateConditionsAndSetLogic(components) {
		// console.log(components);
		components.forEach((comp) => {
			if (comp && comp.conditional && comp.conditional.conditions)
				comp.conditional.conditions.forEach((codition) => {
					comp.customConditional = createCustomConditions(
						codition.component,
						codition.operator,
						codition.value,
						comp.customConditional,
					);
					console.log(comp.customConditional);
				});
			if (comp.customConditional && !comp.customConditional.endsWith(';'))
				comp.customConditional = comp.customConditional.concat(';');
		});
		return components;
	}

	function createCustomConditions(
		component,
		operator,
		value,
		existingCustomConditional,
	) {
		let condition = '';
		let fullCondition = existingCustomConditional
			? existingCustomConditional
			: '';
		switch (operator) {
			case 'isEqual':
				condition = `data.${component} && data.${component} == '${value}'`;
				break;
			case 'isNotEqual':
				condition = `data.${component} && data.${component} != '${value}'`;
				break;
			case 'isEmpty':
				condition = `!data.${component}`;
				break;
			case 'isNotEmpty':
				condition = `!!data.${component}`;
				break;
			case 'includes':
				condition = `data.${component} && data.${component}.includes('${value}')`;
				break;
			case 'notIncludes':
				condition = `data.${component} && !data.${component}.includes('${value}')`;
				break;
			case 'endsWith':
				condition = `data.${component} && data.${component}.endsWith('${value}')`;
				break;
			default:
				break;
		}
		console.log('existingCustomConditional->', existingCustomConditional);
		if (existingCustomConditional) {
			if (existingCustomConditional.endsWith(';'))
				fullCondition =
					existingCustomConditional.slice(0, -1) + ' && ' + condition;
			else fullCondition = existingCustomConditional + ' && ' + condition;
		} else {
			fullCondition = `show = ${condition}`;
		}
		return fullCondition;
	}

	return (
		<div>
			<div ref={elementDidMount}></div>
		</div>
	);
};

FormBuilder.propTypes = {
	form: PropTypes.object,
	options: PropTypes.object,
	onChange: PropTypes.func,
	onSaveComponent: PropTypes.func,
	onUpdateComponent: PropTypes.func,
	onDeleteComponent: PropTypes.func,
	onCancelComponent: PropTypes.func,
	onEditComponent: PropTypes.func,
	Builder: PropTypes.any,
};

export default FormBuilder;
